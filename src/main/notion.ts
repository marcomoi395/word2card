import {
    APIErrorCode,
    Client,
    isFullDatabase,
    isFullPage,
    isNotionClientError,
    PageObjectResponse
} from '@notionhq/client'
import type { FlashcardResponse } from './open-ai'
import State from './state'

export interface NotionDataSourcePages {
    dataSourceId: string
    dataSourceName: string
    pages: PageObjectResponse[]
}

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

    public static async retrieveDataSources(databaseId: string) {
        try {
            const notion = NotionService.getInstance()
            const database = await notion.databases.retrieve({
                database_id: databaseId
            })

            if (!isFullDatabase(database)) {
                return []
            }

            return database.data_sources.map((dataSource) => ({
                id: dataSource.id,
                name: dataSource.name.trim() || dataSource.id
            }))
        } catch (error) {
            NotionService.handleError(error)
        }
    }

    private static async queryDataSourcePages(dataSourceId: string): Promise<PageObjectResponse[]> {
        const notion = NotionService.getInstance()
        const pages: PageObjectResponse[] = []
        let nextCursor: string | undefined

        do {
            const response = await notion.dataSources.query({
                data_source_id: dataSourceId,
                start_cursor: nextCursor,
                filter: {
                    property: 'isSync',
                    checkbox: {
                        equals: false
                    }
                }
            })

            pages.push(...response.results.filter(isFullPage))
            nextCursor = response.has_more ? response.next_cursor ?? undefined : undefined
        } while (nextCursor)

        return pages
    }

    public static async getPages(databaseId: string): Promise<NotionDataSourcePages[]> {
        try {
            const dataSources = await NotionService.retrieveDataSources(databaseId)
            if (!dataSources || dataSources.length === 0) {
                throw new Error('No data source found for the given database ID')
            }

            const results = await Promise.all(
                dataSources.map(async (dataSource) => ({
                    dataSourceId: dataSource.id,
                    dataSourceName: dataSource.name,
                    pages: await NotionService.queryDataSourcePages(dataSource.id)
                }))
            )

            return results.filter((result) => result.pages.length > 0)
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
}

export type { PageObjectResponse }
