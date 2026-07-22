import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotionService } from '../notion'
import { resetNotionService } from '../../../test/helpers/singleton-reset'
import { APIErrorCode } from '@notionhq/client'

// Mock @notionhq/client with prototype pattern
vi.mock('@notionhq/client', () => {
    const Client = vi.fn()
    Client.prototype.databases = { retrieve: vi.fn() }
    Client.prototype.dataSources = { query: vi.fn() }
    Client.prototype.pages = { update: vi.fn() }

    return {
        Client,
        APIErrorCode: {
            Unauthorized: 'unauthorized',
            ObjectNotFound: 'object_not_found',
            RateLimited: 'rate_limited',
            RestrictedResource: 'restricted_resource',
            ServiceUnavailable: 'service_unavailable'
        },
        isNotionClientError: vi.fn(),
        isFullDatabase: vi.fn(),
        isFullPage: vi.fn()
    }
})

// Mock State
vi.mock('../state', () => ({
    default: { getToken: vi.fn() }
}))

import { Client, isFullDatabase, isFullPage, isNotionClientError } from '@notionhq/client'
import State from '../state'

describe('NotionService', () => {
    beforeEach(() => {
        // Reset singleton to prevent test contamination
        resetNotionService(NotionService)

        // Reset mocks
        vi.clearAllMocks()
        vi.mocked(State.getToken).mockReturnValue('test-token')
        vi.mocked(isNotionClientError).mockReturnValue(false)
    })

    describe('getInstance', () => {
        it('returns Client instance when token is set', () => {
            const instance = NotionService.getInstance()
            expect(Client).toHaveBeenCalledWith({ auth: 'test-token' })
            expect(instance).toBeDefined()
        })

        it('throws when notionToken is not set', () => {
            vi.mocked(State.getToken).mockReturnValue(undefined)
            expect(() => NotionService.getInstance()).toThrow('Notion token is not set')
        })

        it('returns same instance when token unchanged', () => {
            NotionService.getInstance()
            NotionService.getInstance()
            expect(Client).toHaveBeenCalledTimes(1)
        })

        it('creates new instance when token changes', () => {
            vi.mocked(State.getToken).mockReturnValue('token-1')
            NotionService.getInstance()
            vi.mocked(State.getToken).mockReturnValue('token-2')
            NotionService.getInstance()
            expect(Client).toHaveBeenCalledTimes(2)
        })
    })

    describe('retrieveDataSources', () => {
        it('returns data sources from database', async () => {
            vi.mocked(isFullDatabase).mockReturnValue(true)
            vi.mocked(Client.prototype.databases.retrieve).mockResolvedValue({
                data_sources: [
                    { id: 'ds-1', name: 'Source 1' },
                    { id: 'ds-2', name: '  Source 2  ' }
                ]
            } as any)

            const result = await NotionService.retrieveDataSources('db-123')

            expect(result).toEqual([
                { id: 'ds-1', name: 'Source 1' },
                { id: 'ds-2', name: 'Source 2' }
            ])
        })

        it('uses id as name when name is empty', async () => {
            vi.mocked(isFullDatabase).mockReturnValue(true)
            vi.mocked(Client.prototype.databases.retrieve).mockResolvedValue({
                data_sources: [{ id: 'ds-1', name: '   ' }]
            } as any)

            const result = await NotionService.retrieveDataSources('db-123')
            expect(result).toEqual([{ id: 'ds-1', name: 'ds-1' }])
        })

        it('returns empty array when database is not full', async () => {
            vi.mocked(isFullDatabase).mockReturnValue(false)
            vi.mocked(Client.prototype.databases.retrieve).mockResolvedValue({} as any)

            const result = await NotionService.retrieveDataSources('db-123')
            expect(result).toEqual([])
        })

        it('throws with custom message for Unauthorized error', async () => {
            const error = { code: APIErrorCode.Unauthorized, message: 'Invalid' }
            vi.mocked(isNotionClientError).mockReturnValue(true)
            vi.mocked(Client.prototype.databases.retrieve).mockRejectedValue(error)

            await expect(NotionService.retrieveDataSources('db-123')).rejects.toThrow(
                'Authentication failed (401)'
            )
        })

        it('throws with custom message for ObjectNotFound error', async () => {
            const error = { code: APIErrorCode.ObjectNotFound, message: 'Not found' }
            vi.mocked(isNotionClientError).mockReturnValue(true)
            vi.mocked(Client.prototype.databases.retrieve).mockRejectedValue(error)

            await expect(NotionService.retrieveDataSources('db-123')).rejects.toThrow(
                'Object not found (404)'
            )
        })

        it('throws with custom message for RateLimited error', async () => {
            const error = { code: APIErrorCode.RateLimited, message: 'Too many' }
            vi.mocked(isNotionClientError).mockReturnValue(true)
            vi.mocked(Client.prototype.databases.retrieve).mockRejectedValue(error)

            await expect(NotionService.retrieveDataSources('db-123')).rejects.toThrow(
                'Rate limited (429)'
            )
        })

        it('throws with custom message for RestrictedResource error', async () => {
            const error = { code: APIErrorCode.RestrictedResource, message: 'Forbidden' }
            vi.mocked(isNotionClientError).mockReturnValue(true)
            vi.mocked(Client.prototype.databases.retrieve).mockRejectedValue(error)

            await expect(NotionService.retrieveDataSources('db-123')).rejects.toThrow(
                'Access restricted (403)'
            )
        })

        it('throws with custom message for ServiceUnavailable error', async () => {
            const error = { code: APIErrorCode.ServiceUnavailable, message: '503' }
            vi.mocked(isNotionClientError).mockReturnValue(true)
            vi.mocked(Client.prototype.databases.retrieve).mockRejectedValue(error)

            await expect(NotionService.retrieveDataSources('db-123')).rejects.toThrow(
                'Notion unavailable (503)'
            )
        })

        it('throws generic Notion API Error message for unknown error codes', async () => {
            const error = { code: 'unknown_code', message: 'Something went wrong' }
            vi.mocked(isNotionClientError).mockReturnValue(true)
            vi.mocked(Client.prototype.databases.retrieve).mockRejectedValue(error)

            await expect(NotionService.retrieveDataSources('db-123')).rejects.toThrow(
                'Notion API Error [unknown_code]: Something went wrong'
            )
        })

        it('throws original error if it is an instance of Error', async () => {
            const error = new Error('Standard error message')
            vi.mocked(isNotionClientError).mockReturnValue(false)
            vi.mocked(Client.prototype.databases.retrieve).mockRejectedValue(error)

            await expect(NotionService.retrieveDataSources('db-123')).rejects.toThrow(
                'Standard error message'
            )
        })

        it('throws generic unknown error if error is not an Error instance', async () => {
            vi.mocked(isNotionClientError).mockReturnValue(false)
            vi.mocked(Client.prototype.databases.retrieve).mockRejectedValue('String error')

            await expect(NotionService.retrieveDataSources('db-123')).rejects.toThrow(
                'An unknown error occurred while communicating with Notion.'
            )
        })
    })

    describe('getPages', () => {
        it('returns pages grouped by data source', async () => {
            vi.mocked(isFullDatabase).mockReturnValue(true)
            vi.mocked(isFullPage).mockReturnValue(true)

            vi.mocked(Client.prototype.databases.retrieve).mockResolvedValue({
                data_sources: [
                    { id: 'ds-1', name: 'Source 1' },
                    { id: 'ds-2', name: 'Source 2' }
                ]
            } as any)

            vi.mocked(Client.prototype.dataSources.query)
                .mockResolvedValueOnce({
                    results: [{ id: 'page-1' }, { id: 'page-2' }],
                    has_more: false
                } as any)
                .mockResolvedValueOnce({
                    results: [{ id: 'page-3' }],
                    has_more: false
                } as any)

            const result = await NotionService.getPages('db-123')

            expect(result).toEqual([
                {
                    dataSourceId: 'ds-1',
                    dataSourceName: 'Source 1',
                    pages: [{ id: 'page-1' }, { id: 'page-2' }]
                },
                {
                    dataSourceId: 'ds-2',
                    dataSourceName: 'Source 2',
                    pages: [{ id: 'page-3' }]
                }
            ])
        })

        it('filters out data sources with no pages', async () => {
            vi.mocked(isFullDatabase).mockReturnValue(true)
            vi.mocked(isFullPage).mockReturnValue(true)

            vi.mocked(Client.prototype.databases.retrieve).mockResolvedValue({
                data_sources: [
                    { id: 'ds-1', name: 'Source 1' },
                    { id: 'ds-2', name: 'Source 2' }
                ]
            } as any)

            vi.mocked(Client.prototype.dataSources.query)
                .mockResolvedValueOnce({
                    results: [{ id: 'page-1' }],
                    has_more: false
                } as any)
                .mockResolvedValueOnce({
                    results: [],
                    has_more: false
                } as any)

            const result = await NotionService.getPages('db-123')

            expect(result).toHaveLength(1)
            expect(result[0].dataSourceId).toBe('ds-1')
        })

        it('throws when no data sources found', async () => {
            vi.mocked(isFullDatabase).mockReturnValue(true)
            vi.mocked(Client.prototype.databases.retrieve).mockResolvedValue({
                data_sources: []
            } as any)

            await expect(NotionService.getPages('db-123')).rejects.toThrow('No data source found')
        })

        it('handles pagination in queryDataSourcePages', async () => {
            vi.mocked(isFullDatabase).mockReturnValue(true)
            vi.mocked(isFullPage).mockReturnValue(true)

            vi.mocked(Client.prototype.databases.retrieve).mockResolvedValue({
                data_sources: [{ id: 'ds-1', name: 'Source 1' }]
            } as any)

            vi.mocked(Client.prototype.dataSources.query)
                .mockResolvedValueOnce({
                    results: [{ id: 'page-1' }],
                    has_more: true,
                    next_cursor: 'cursor-1'
                } as any)
                .mockResolvedValueOnce({
                    results: [{ id: 'page-2' }],
                    has_more: false
                } as any)

            const result = await NotionService.getPages('db-123')

            expect(result[0].pages).toHaveLength(2)
            expect(Client.prototype.dataSources.query).toHaveBeenCalledTimes(2)
        })
    })

    describe('update', () => {
        it('updates page with fallback for missing optional fields', async () => {
            vi.mocked(isNotionClientError).mockReturnValue(false)
            vi.mocked(Client.prototype.pages.update).mockResolvedValue({} as any)

            const payload = {
                word: 'bank',
                pos: 'noun',
                vietnamese: 'ngân hàng'
                // Missing example and ipa
            }

            await NotionService.update('page-123', payload)
            const mockCall = vi.mocked(Client.prototype.pages.update).mock.calls[0][0] as any
            expect(mockCall.properties.Examples.rich_text[0].text.content).toBe('')
            expect(mockCall.properties.Pronunciation.rich_text[0].text.content).toBe('')
        })
        it('calls pages.update with correct structure', async () => {
            const payload = {
                word: 'bank',
                example: 'I went to the bank.',
                pos: 'noun',
                ipa: '/bæŋk/',
                vietnamese: 'ngân hàng'
            }

            await NotionService.update('page-123', payload)

            expect(Client.prototype.pages.update).toHaveBeenCalledWith({
                page_id: 'page-123',
                properties: expect.objectContaining({
                    English: {
                        title: [{ text: { content: 'bank' } }]
                    },
                    isSync: {
                        type: 'checkbox',
                        checkbox: true
                    }
                })
            })
        })
    })
})
