import { NotionService } from '../notion'
import { getRuntimeState } from '../state/runtime'
import type { ImportRequest, AppResponse, SecretKey } from '../../shared/ipc'
import { success, failure } from '../utils/response'
import { readFileContent } from '../helper/readFile'
import { getWordEntriesFromResponse } from '../helper/get-words-from-notion-response'
import {
    filterNotionTargetsByWords,
    resolveNotionDeckName,
    type NotionSyncTarget
} from '../helper/notion-sync'
import type { DatabaseRepositories } from '../database'

let database: DatabaseRepositories | null = null
export interface ImportSummary {
    inserted: number
    skipped: number
    failed: number
}
const syncRuntimeSecret = (key: SecretKey, value: string): boolean => {
    const trimmed = value.trim()
    return Boolean(trimmed) && getRuntimeState().updateRuntimeSettings({ [key]: trimmed })
}
export function setImportDatabase(repositories: DatabaseRepositories): void {
    database = repositories
}
const persistWords = (words: string[], source: 'file' | 'notion') => {
    if (!database) throw new Error('Import database is not initialized')
    return database.transaction(() => {
        const imported: string[] = []
        let skipped = 0
        for (const word of words) {
            const result = database!.vocabulary.create({ word, source })
            if (result.inserted) imported.push(word)
            else skipped++
        }
        return { words: imported, summary: { inserted: imported.length, skipped, failed: 0 } }
    })
}
export class ImportService {
    private static lastSummary: ImportSummary = { inserted: 0, skipped: 0, failed: 0 }
    private static async loadWords(
        request: ImportRequest
    ): Promise<AppResponse<{ words: string[]; notionTargets?: NotionSyncTarget[] }>> {
        if (request.type === 'FILE_IMPORT') {
            const raw = await readFileContent(request.payload.filePath)
            if (raw === null) return failure('Failed to read words from the source.')
            const persisted = persistWords(raw, 'file')
            this.lastSummary = persisted.summary
            return success({ words: persisted.words })
        }
        try {
            if (
                !syncRuntimeSecret('notionToken', request.payload.token) ||
                !syncRuntimeSecret('notionDatabaseId', request.payload.notionDatabaseId)
            )
                return failure('Failed to save Notion settings.')
            const sources = await NotionService.getPages(request.payload.notionDatabaseId)
            if (!sources?.length) return failure('No pages found in the Notion database.')
            const targets = sources.flatMap((source) =>
                getWordEntriesFromResponse(source.pages).map((entry) => ({
                    pageId: entry.pageId,
                    word: entry.word,
                    deckName: resolveNotionDeckName(request.payload.deck, source.dataSourceName)
                }))
            )
            const persisted = persistWords(
                targets.map((target) => target.word),
                'notion'
            )
            this.lastSummary = persisted.summary
            return success({
                words: persisted.words,
                notionTargets: filterNotionTargetsByWords(targets, persisted.words)
            })
        } catch (error) {
            return failure(
                error instanceof Error
                    ? error.message
                    : 'Error retrieving data from Notion, please check your token and database ID.'
            )
        }
    }
    public static async handleImportRequest(
        request: ImportRequest
    ): Promise<AppResponse<ImportSummary>> {
        try {
            const loaded = await this.loadWords(request)
            if (loaded.status === 'error') return failure(loaded.message)
            return success(
                this.lastSummary,
                this.lastSummary.inserted === 0
                    ? 'No new words to import.'
                    : 'Words imported successfully.'
            )
        } catch (error) {
            return failure(error instanceof Error ? error.message : 'Failed to import words')
        }
    }
}
