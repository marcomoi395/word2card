import { createLogger } from '../../shared/logger'
import { resolveImportedDeckName } from '../../shared/deck'
import { NotionService } from '../notion'
import { getRuntimeState } from '../state/runtime'
import type { ImportRequest, AppResponse, ImportDraftRecord, ImportSummary } from '../../shared/ipc'
import { success, failure } from '../utils/response'
import { readFileContent } from '../helper/readFile'
import { getWordEntriesFromResponse } from '../helper/get-words-from-notion-response'
import type { DatabaseRepositories } from '../database'

const logger = createLogger('main.import')

const createDraftRecords = (
    words: string[],
    source: 'file' | 'notion',
    deckName: string
): ImportDraftRecord[] => {
    const seen = new Set<string>()
    return words.flatMap((rawWord, index) => {
        const word = rawWord.trim()
        const normalized = word.toLocaleLowerCase()
        if (!word || seen.has(normalized)) {
            return []
        }
        seen.add(normalized)
        return [
            {
                id: `draft-${Date.now()}-${index}-${normalized}`,
                word,
                source,
                sourceReference: null,
                deckName,
                partOfSpeech: null,
                cloze: null,
                example: null,
                vietnamese: null,
                ipa: null,
                meaning: null,
                imageUrl: null,
                imageProvider: null,
                generationStatus: 'pending' as const,
                generationError: null
            }
        ]
    })
}

let importDatabase: DatabaseRepositories | undefined

export function setImportDatabase(repositories?: DatabaseRepositories): void {
    importDatabase = repositories
}

export class ImportService {
    private static lastSummary: ImportSummary = { inserted: 0, skipped: 0, failed: 0 }

    private static async loadWords(request: ImportRequest): Promise<
        AppResponse<{
            words: string[]
            records: ImportDraftRecord[]
        }>
    > {
        if (request.type === 'FILE_IMPORT') {
            const raw = await readFileContent(request.payload.filePath)
            if (raw === null) {
                return failure('Failed to read words from the source.')
            }
            const nonEmptyWords = raw.filter((word) => word.trim()).length
            const drafts = createDraftRecords(
                raw,
                'file',
                resolveImportedDeckName(request.payload.deck)
            )
            const existingWords = new Set(
                importDatabase?.vocabulary.list().map((record) => record.normalizedWord) ?? []
            )
            const records = drafts.filter(
                (record) => !existingWords.has(record.word.toLocaleLowerCase())
            )
            this.lastSummary = {
                inserted: records.length,
                skipped: nonEmptyWords - records.length,
                failed: 0,
                records
            }
            return success({ words: records.map((record) => record.word), records })
        }
        try {
            const settings = getRuntimeState().getRuntimeSettings()
            const notionToken = request.payload.token?.trim() || settings.notionToken || ''
            const notionDatabaseId =
                request.payload.notionDatabaseId?.trim() || settings.notionDatabaseId || ''
            if (!notionToken || !notionDatabaseId) {
                return failure('Please configure the Notion token and database ID in Settings.')
            }
            if (request.payload.token || request.payload.notionDatabaseId) {
                if (!getRuntimeState().updateRuntimeSettings({ notionToken, notionDatabaseId })) {
                    return failure('Failed to save Notion settings.')
                }
            }
            const sources = await NotionService.getPages(notionDatabaseId)
            if (!sources?.length) {
                return failure('No pages found in the Notion database.')
            }
            const words = sources.flatMap((source) =>
                getWordEntriesFromResponse(source.pages).map((entry) => entry.word)
            )
            const sourceWords = words.filter((word) => word.trim()).length
            const drafts = createDraftRecords(
                words,
                'notion',
                resolveImportedDeckName(request.payload.deck)
            )
            const existingWords = new Set(
                importDatabase?.vocabulary.list().map((record) => record.normalizedWord) ?? []
            )
            const records = drafts.filter(
                (record) => !existingWords.has(record.word.toLocaleLowerCase())
            )
            this.lastSummary = {
                inserted: records.length,
                skipped: sourceWords - records.length,
                failed: 0,
                records
            }
            return success({
                words: records.map((record) => record.word),
                records
            })
        } catch (error) {
            logger.error('notion_import_failed', { source: 'notion', error })
            return failure(
                error instanceof Error ? error.message : 'Error retrieving data from Notion.'
            )
        }
    }

    public static async handleImportRequest(
        request: ImportRequest
    ): Promise<AppResponse<ImportSummary>> {
        try {
            const loaded = await this.loadWords(request)
            if (loaded.status === 'error') {
                return failure(loaded.message)
            }
            return success(this.lastSummary, 'Words loaded into review.')
        } catch (error) {
            return failure(error instanceof Error ? error.message : 'Failed to load words')
        }
    }
}
