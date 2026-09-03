import type { DatabaseRepositories, VocabularyRecord } from '../database'
import type { QuizNote } from '../handle'
import type { AnkiSubmissionSummary, AppResponse } from '../../shared/ipc'
import { DeckService } from './deck.service'
import { failure, success } from '../utils/response'
import { createLogger } from '../../shared/logger'

const logger = createLogger('main.anki')
const REQUIRED_FIELDS: (keyof VocabularyRecord)[] = ['word', 'partOfSpeech', 'vietnamese']
const missingFields = (record: VocabularyRecord): string[] =>
    REQUIRED_FIELDS.filter((field) => {
        const value = record[field]
        return typeof value !== 'string' || value.trim() === ''
    }).map(String)
const toNote = (record: VocabularyRecord): QuizNote => ({
    deckName: 'Default',
    modelName: 'AnkiVNModel_Flashcard',
    fields: {
        id: record.id,
        word: record.word,
        pos: record.partOfSpeech ?? undefined,
        cloze: record.cloze ?? undefined,
        vietnamese: record.vietnamese ?? '',
        ipa: record.ipa ?? undefined,
        image: record.imageUrl ?? undefined,
        audio_word: record.audio ?? undefined
    },
    options: { allowDuplicate: false },
    audio: []
})

export class AnkiService {
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
                logger.warn('anki_card_validation_failed', {
                    id: record.id,
                    missingFieldCount: missing.length
                })
                summary.failed++
            } else valid.push(record)
        }
        if (!valid.length) {
            if (summary.failed) {
                logger.warn('anki_submission_validation_failed', { failedCount: summary.failed })
            }
            return summary.failed
                ? failure(`No cards submitted. ${summary.failed} card(s) failed validation.`)
                : success(summary)
        }
        const result = await DeckService.addNotesToAnki(valid.map(toNote))
        if (result.status === 'error') {
            logger.error('anki_submission_rejected', {
                error: new Error(result.message),
                recordCount: valid.length
            })
            return failure(result.message)
        }
        for (const record of valid) {
            repositories.vocabulary.update(record.id, { ankiStatus: 'submitted', ankiError: null })
            summary.submitted++
        }
        return success(summary)
    }
}
