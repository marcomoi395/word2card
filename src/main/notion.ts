import { APIErrorCode, Client, DatabaseObjectResponse, isNotionClientError } from '@notionhq/client'
import State from './state'

export class NotionService {
    private static instance: Client | null = null
    private static currentToken: string | null = null

    private constructor() {
        // Prevent direct instantiation
    }

    private static handleError(error: unknown): never {
        if (isNotionClientError(error)) {
            // Error code reference: https://developers.notion.com/reference/errors
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
                    // Return the original Notion error for debugging unknown issues
                    throw new Error(`Notion API Error [${error.code}]: ${error.message}`)
            }
        }

        // Handle standard JS errors (network issues, logic errors)
        if (error instanceof Error) {
            throw error
        }

        throw new Error('An unknown error occurred while communicating with Notion.')
    }

    public static getInstance(): Client {
        const newKey = State.getToken('notionToken')

        if (!newKey) {
            throw new Error('Missing OpenAI API key in state')
        }

        if (!NotionService.instance || NotionService.currentToken !== newKey) {
            NotionService.instance = new Client({
                auth: newKey
            })

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
}
