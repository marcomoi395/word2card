import { Client, DatabaseObjectResponse } from '@notionhq/client'
import State from './state'

export class NotionService {
    private static instance: Client | null = null
    private static currentToken: string | null = null

    private constructor() {
        // Prevent direct instantiation
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
        const notion = NotionService.getInstance()

        const database = (await notion.databases.retrieve({
            database_id: databaseId
        })) as DatabaseObjectResponse

        if (database.data_sources && database.data_sources.length > 0) {
            return database.data_sources[0].id
        }

        return null
    }

    public static async getPages(databaseId: string) {
        const notion = NotionService.getInstance()

        const dataSourceId = await NotionService.retrieveDataSource(databaseId)
        if (!dataSourceId) {
            throw new Error('No data source found for the given database ID')
        }

        return await notion.dataSources.query({
            data_source_id: dataSourceId
        })
    }
}
