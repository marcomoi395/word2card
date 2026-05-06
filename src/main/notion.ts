import {
    APIErrorCode,
    Client,
    DatabaseObjectResponse,
    isNotionClientError,
    PageObjectResponse
} from '@notionhq/client'
import pLimit from 'p-limit'
import type { FlashcardResponse } from './open-ai'
import State from './state'

export class NotionService {
    private static instance: Client | null = null
    private static currentToken: string | null = null

    private constructor() {
        // Prevent direct instantiation
    }

    private static handleError(error: unknown): never {
        if (isNotionClientError(error)) {
            switch (error.code) {
                case APIErrorCode.Unauthorized:
                    throw new Error(
                        'Authentication failed (401): Invalid or expired Notion token. Please check your token in Settings.'
                    )
                case APIErrorCode.ObjectNotFound:
                    throw new Error(
                        'Object not found (404): The Database ID does not exist, or the Integration does not have access to this page (Did you add the connection to the page?).'
                    )
                case APIErrorCode.RateLimited:
                    throw new Error(
                        'Rate limited (429): Too many requests to Notion. Please try again in a few seconds.'
                    )
                case APIErrorCode.RestrictedResource:
                    throw new Error(
                        'Access restricted (403): This token does not have permission to perform this action.'
                    )
                case APIErrorCode.ServiceUnavailable:
                    throw new Error(
                        'Notion unavailable (503): Notion servers are having issues. Please try again later.'
                    )
                default:
                    throw new Error(`Notion API Error [${error.code}]: ${error.message}`)
            }
        }

        if (error instanceof Error) {
            throw error
        }

        throw new Error('An unknown error occurred while communicating with Notion.')
    }

    public static getInstance(): Client {
        const newKey = State.getToken('notionToken')
        if (!newKey) {
            throw new Error('Notion token is not set. Please provide a valid token in Settings.')
        }

        if (!NotionService.instance || NotionService.currentToken !== newKey) {
            NotionService.instance = new Client({ auth: newKey })
            NotionService.currentToken = newKey
        }

        return NotionService.instance
    }

    public static async retrieveDataSource(databaseId: string) {
        try {
            const notion = NotionService.getInstance()
            const database = (await notion.databases.retrieve({
                database_id: databaseId
            })) as DatabaseObjectResponse

            if (database.data_sources && database.data_sources.length > 0) {
                return database.data_sources[0].id
            }

            return null
        } catch (error) {
            NotionService.handleError(error)
        }
    }

    public static async getPages(databaseId: string) {
        try {
            const notion = NotionService.getInstance()
            const dataSourceId = await NotionService.retrieveDataSource(databaseId)
            if (!dataSourceId) {
                throw new Error('No data source found for the given database ID')
            }

            const result = await notion.dataSources.query({
                data_source_id: dataSourceId,
                filter: {
                    property: 'isSync',
                    checkbox: {
                        equals: false
                    }
                }
            })

            return result.results
        } catch (error) {
            NotionService.handleError(error)
        }
    }

    public static async update(pageId: string, payload: FlashcardResponse) {
        const notion = NotionService.getInstance()
        await notion.pages.update({
            page_id: pageId,
            properties: {
                English: {
                    title: [
                        {
                            text: {
                                content: payload.word
                            }
                        }
                    ]
                },
                Examples: {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: payload.example || ''
                            }
                        }
                    ]
                },
                isSync: {
                    type: 'checkbox',
                    checkbox: true
                },
                Category: {
                    type: 'multi_select',
                    multi_select: [
                        {
                            name: payload.pos
                        }
                    ]
                },
                Pronunciation: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: payload.ipa || ''
                            }
                        }
                    ]
                },
                'Meaning (VN)': {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: payload.vietnamese || ''
                            }
                        }
                    ]
                }
            }
        })
    }

    public static async updatePages(pageMap: Map<string, string>, data: FlashcardResponse[]) {
        try {
            const limit = pLimit(2)
            const promises = data.map((item) => {
                return limit(() => {
                    const pageId = pageMap.get(item.word.toLowerCase().trim())
                    if (!pageId) {
                        console.log(`Not found: ${item.word}`)
                        return
                    }

                    return NotionService.update(pageId, item)
                })
            })

            await Promise.allSettled(promises)
        } catch (error) {
            console.error('Error updating Notion pages:', error)
        }
    }
}

export type { PageObjectResponse }
