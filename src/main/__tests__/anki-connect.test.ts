import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkAnkiConnect, sendRequest } from '../anki-connect'

describe('anki-connect', () => {
    let mockFetch: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mockFetch = vi.fn()
        vi.stubGlobal('fetch', mockFetch)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    describe('checkAnkiConnect', () => {
        it('returns true when Anki is running (status 200)', async () => {
            mockFetch.mockResolvedValue({
                status: 200
            })

            const result = await checkAnkiConnect()

            expect(result).toBe(true)
            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8765')
        })

        it('returns false when response status is not 200', async () => {
            mockFetch.mockResolvedValue({
                status: 404
            })

            const result = await checkAnkiConnect()

            expect(result).toBe(false)
        })

        it('returns false when fetch throws error (Anki not running)', async () => {
            mockFetch.mockRejectedValue(new Error('Connection refused'))

            const result = await checkAnkiConnect()

            expect(result).toBe(false)
        })

        it('returns false when fetch throws non-Error object', async () => {
            mockFetch.mockRejectedValue('network timeout')

            const result = await checkAnkiConnect()

            expect(result).toBe(false)
        })
    })

    describe('sendRequest', () => {
        describe('happy path', () => {
            it('returns valid AnkiResponse when request succeeds', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        result: ['deck1', 'deck2'],
                        error: null
                    })
                })

                const result = await sendRequest<string[]>({
                    action: 'deckNames',
                    version: 6
                })

                expect(result).toEqual({
                    result: ['deck1', 'deck2'],
                    error: null
                })
                expect(mockFetch).toHaveBeenCalledWith('http://localhost:8765', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'deckNames',
                        version: 6
                    })
                })
            })

            it('returns AnkiResponse with error field when Anki reports error', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        result: null,
                        error: 'deck already exists'
                    })
                })

                const result = await sendRequest({
                    action: 'createDeck',
                    version: 6,
                    params: { deck: 'MyDeck' }
                })

                expect(result).toEqual({
                    result: null,
                    error: 'deck already exists'
                })
            })
        })

        describe('error handling', () => {
            it('throws when response.ok is false', async () => {
                mockFetch.mockResolvedValue({
                    ok: false,
                    status: 500
                })

                await expect(
                    sendRequest({
                        action: 'deckNames',
                        version: 6
                    })
                ).rejects.toThrow('AnkiConnect request failed with status 500')
            })

            it('throws when response is not valid AnkiResponse (missing result field)', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        error: null
                        // missing 'result' field
                    })
                })

                await expect(
                    sendRequest({
                        action: 'deckNames',
                        version: 6
                    })
                ).rejects.toThrow('Invalid response from AnkiConnect')
            })

            it('throws when response is not valid AnkiResponse (missing error field)', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        result: ['deck1']
                        // missing 'error' field
                    })
                })

                await expect(
                    sendRequest({
                        action: 'deckNames',
                        version: 6
                    })
                ).rejects.toThrow('Invalid response from AnkiConnect')
            })

            it('throws when response is not an object', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => 'not an object'
                })

                await expect(
                    sendRequest({
                        action: 'deckNames',
                        version: 6
                    })
                ).rejects.toThrow('Invalid response from AnkiConnect')
            })

            it('throws when response is null', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => null
                })

                await expect(
                    sendRequest({
                        action: 'deckNames',
                        version: 6
                    })
                ).rejects.toThrow('Invalid response from AnkiConnect')
            })

            it('throws when fetch throws error', async () => {
                mockFetch.mockRejectedValue(new Error('Network error'))

                await expect(
                    sendRequest({
                        action: 'deckNames',
                        version: 6
                    })
                ).rejects.toThrow('Network error')
            })

            it('throws when json() throws error', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => {
                        throw new Error('Invalid JSON')
                    }
                })

                await expect(
                    sendRequest({
                        action: 'deckNames',
                        version: 6
                    })
                ).rejects.toThrow('Invalid JSON')
            })
        })
    })
})
