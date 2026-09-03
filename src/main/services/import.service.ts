import { createLogger } from '../../shared/logger'
import { NotionService } from '../notion'
import { getRuntimeState } from '../state/runtime'
import type { ImportRequest, AppResponse, SecretKey, ImportDraftRecord, ImportSummary } from '../../shared/ipc'
import { success, failure } from '../utils/response'
import { readFileContent } from '../helper/readFile'
import { getWordEntriesFromResponse } from '../helper/get-words-from-notion-response'
import {
    filterNotionTargetsByWords,
    resolveNotionDeckName,
    type NotionSyncTarget
} from '../helper/notion-sync'
import type { DatabaseRepositories } from '../database'

const logger = createLogger('main.import')

const syncRuntimeSecret = (key: SecretKey, value: string): boolean => {
    const trimmed = value.trim()
    return Boolean(trimmed) && getRuntimeState().updateRuntimeSettings({ [key]: trimmed })
}

const createDraftRecords = (words: string[], source: 'file' | 'notion'): ImportDraftRecord[] => {
    const seen = new Set<string>()
    return words.flatMap((rawWord, index) => {
        const word = rawWord.trim()
        const normalized = word.toLocaleLowerCase()
        if (!word || seen.has(normalized)) return []
        seen.add(normalized)
        return [{
            id: `draft-${Date.now()}-${index}-${normalized}`,
            word,
            source,
            sourceReference: null,
            partOfSpeech: null,
            cloze: null,
            example: null,
            vietnamese: null,
            ipa: null,
            meaning: null,
            imageUrl: null,
            imageProvider: null,
            audio: null,
            generationStatus: 'pending' as const,
            generationError: null
        }]
    })
}

export function setImportDatabase(_repositories?: DatabaseRepositories): void {}

export class ImportService {
    private static lastSummary: ImportSummary = { inserted: 0, skipped: 0, failed: 0 }

    private static async loadWords(
        request: ImportRequest
    ): Promise<AppResponse<{ words: string[]; records: ImportDraftRecord[]; notionTargets?: NotionSyncTarget[] }>> {
        if (request.type === 'FILE_IMPORT') {
            const raw = await readFileContent(request.payload.filePath)
            if (raw === null) return failure('Failed to read words from the source.')
            const records = createDraftRecords(raw, 'file')
            this.lastSummary = { inserted: records.length, skipped: 0, failed: 0, records }
            return success({ words: records.map((record) => record.word), records })
        }
        try {
            if (
                !syncRuntimeSecret('notionToken', request.payload.token) ||
                !syncRuntimeSecret('notionDatabaseId', request.payload.notionDatabaseId)
            ) return failure('Failed to save Notion settings.')
            const sources = await NotionService.getPages(request.payload.notionDatabaseId)
            if (!sources?.length) return failure('No pages found in the Notion database.')
            const targets = sources.flatMap((source) =>
                getWordEntriesFromResponse(source.pages).map((entry) => ({
                    pageId: entry.pageId,
                    word: entry.word,
                    deckName: resolveNotionDeckName(request.payload.deck, source.dataSourceName)
                }))
            )
            const records = createDraftRecords(targets.map((target) => target.word), 'notion')
            this.lastSummary = { inserted: records.length, skipped: 0, failed: 0, records }
            return success({
                words: records.map((record) => record.word),
                records,
                notionTargets: filterNotionTargetsByWords(targets, records.map((record) => record.word))
            })
        } catch (error) {
            logger.error('notion_import_failed', { source: 'notion', error })
            return failure(error instanceof Error ? error.message : 'Error retrieving data from Notion.')
        }
    }

    public static async handleImportRequest(request: ImportRequest): Promise<AppResponse<ImportSummary>> {
        try {
            const loaded = await this.loadWords(request)
            if (loaded.status === 'error') return failure(loaded.message)
            return success(this.lastSummary, 'Words loaded into review.')
        } catch (error) {
            return failure(error instanceof Error ? error.message : 'Failed to load words')
        }
    }
}
