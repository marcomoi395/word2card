import { Client } from '@notionhq/client'
import State from './state'

// interface NotionResponse {
//     results: Array<{
//         id: string
//         properties: {
//             English: { title: Array<{ plain_text: string }> }
//             Category: { multi_select: Array<{ name: string }> }
//             Pronunciation: { rich_text: Array<{ plain_text: string }> }
//             'Meaning (VN)': { rich_text: Array<{ plain_text: string }> }
//             Examples: { rich_text: Array<{ plain_text: string }> }
//             [key: string]: any
//         }
//     }>
// }

// const mapNotionResponseToFlashcards = (data: NotionResponse): Flashcard[] => {
//     if (!data || !data.results) {
//         return []
//     }
//
//     return data.results.map((page) => {
//         const props = page.properties
//
//         const getRichText = (prop: any) => prop?.rich_text?.[0]?.plain_text
//         const getTitle = (prop: any) => prop?.title?.[0]?.plain_text
//         const getSelect = (prop: any) => prop?.multi_select?.[0]?.name
//
//         return {
//             id: page.id,
//             word: getTitle(props.English) || '',
//             pos: getSelect(props.Category),
//             example: getRichText(props.Examples),
//             vietnamese: getRichText(props['Meaning (VN)']) || '',
//             ipa: getRichText(props.Pronunciation),
//             image: undefined,
//             audio_word: undefined
//         }
//     })
// }

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

    public static async getPages(dataSourceId: string) {
        const notion = NotionService.getInstance()

        return await notion.dataSources.query({
            data_source_id: dataSourceId
        })
    }
}
