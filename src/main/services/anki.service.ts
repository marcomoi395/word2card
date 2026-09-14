import type { DatabaseRepositories, VocabularyRecord } from '../database'
import type { ImportDraftRecord } from '../../shared/ipc'
import type { QuizNote } from '../handle'
import { normalizeIpa } from '../handle'
import type { AnkiSubmissionSummary, AppResponse } from '../../shared/ipc'
import { DeckService } from './deck.service'
import { success } from '../utils/response'
const REQUIRED_FIELDS: (keyof VocabularyRecord)[] = ['word', 'partOfSpeech', 'vietnamese']
const missingFields = (record: VocabularyRecord): string[] =>
    REQUIRED_FIELDS.filter((field) => {
        const value = record[field]
        return typeof value !== 'string' || value.trim() === ''
    }).map(String)
const toNote = (record: VocabularyRecord): QuizNote => ({
    deckName: record.deckName,
    modelName: 'AnkiVNModel_Flashcard_TTS',
    fields: {
        id: record.id,
        word: record.word,
        pos: record.partOfSpeech ?? undefined,
        cloze: record.cloze ?? undefined,
        vietnamese: record.vietnamese ?? '',
        ipa: normalizeIpa(record.ipa ?? undefined),
        image: record.imageUrl ?? undefined
    },
    options: { allowDuplicate: false }
})

export class AnkiService {
    public static async submitDraftCards(
        repositories: DatabaseRepositories,
        records: ImportDraftRecord[]
    ): Promise<AppResponse<AnkiSubmissionSummary>> {
        let duplicates = 0
        const persisted = repositories.transaction(() =>
            records.flatMap((record) => {
                const result = repositories.vocabulary.create(record)
                if (result.inserted && result.record) {
                    return [result.record]
                }
                const existing = repositories.vocabulary
                    .list()
                    .find((item) => item.normalizedWord === record.word.trim().toLocaleLowerCase())
                if (existing?.ankiStatus === 'failed') {
                    return [existing]
                }
                duplicates++
                return []
            })
        )
        if (persisted.length === 0) {
            return success({
                processed: duplicates,
                submitted: 0,
                duplicates,
                failed: 0
            })
        }
        const response = await this.submitPersistedCards(
            repositories,
            persisted.map((record) => record.id)
        )
        if (response.status === 'error') {
            return response
        }
        return success({
            ...response.data!,
            processed: response.data!.processed + duplicates,
            duplicates: response.data!.duplicates + duplicates
        })
    }

    public static async submitPersistedCards(
        repositories: DatabaseRepositories,
        recordIds?: string[]
    ): Promise<AppResponse<AnkiSubmissionSummary>> {
        const records = recordIds?.length
            ? recordIds
                  .map((id) => repositories.vocabulary.get(id))
                  .filter((r): r is VocabularyRecord => r !== null)
            : repositories.vocabulary.list()
        const summary: AnkiSubmissionSummary = {
            processed: records.length,
            submitted: 0,
            duplicates: 0,
            failed: 0
        }
        const valid: VocabularyRecord[] = []
        for (const record of records) {
            const missing = missingFields(record)
            if (missing.length) {
                repositories.vocabulary.update(record.id, {
                    ankiStatus: 'failed',
                    ankiError: `Missing required fields: ${missing.join(', ')}`
                })
                summary.failed++
            } else {
                valid.push(record)
            }
        }
        if (!valid.length) {
            return success(summary)
        }
        const result = await DeckService.addNotesToAnki(valid.map(toNote))
        if (result.status === 'error') {
            for (const record of valid) {
                repositories.vocabulary.update(record.id, {
                    ankiStatus: 'failed',
                    ankiError: result.message
                })
            }
            summary.failed += valid.length
            return success(summary, result.message)
        }
        const noteResults = result.data ?? valid.map(() => 1)
        valid.forEach((record, index) => {
            if (noteResults[index] === null) {
                repositories.vocabulary.update(record.id, {
                    ankiStatus: 'failed',
                    ankiError: 'Duplicate card in Anki'
                })
                summary.duplicates++
                return
            }
            repositories.vocabulary.update(record.id, { ankiStatus: 'submitted', ankiError: null })
            summary.submitted++
        })
        return success(summary)
    }
}
