import { createLogger } from '../../shared/logger'
import type { ImportDraftRecord } from '../../shared/ipc'
import type { DatabaseRepositories } from '../database'
import { OpenAIService, type FlashcardResponse } from '../open-ai'
import type { GenerationSummary } from '../../shared/ipc'

const logger = createLogger('main.generation')
export interface GenerationResult extends GenerationSummary {
    results: Array<{ id: string; status: 'ready' | 'failed'; error?: string }>
}

function validText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function validateGenerated(item: FlashcardResponse): string | null {
    if (!validText(item.word)) return 'Generated record is missing a word'
    if (!validText(item.pos)) return 'Generated record is missing part of speech'
    if (!validText(item.vietnamese)) return 'Generated record is missing Vietnamese meaning'
    if (!validText(item.ipa)) return 'Generated record is missing pronunciation'
    if (!validText(item.example)) return 'Generated record is missing example sentence'
    return null
}

function failureMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Generation failed'
}

export class GenerationService {
    static async generateDraftData(records: ImportDraftRecord[]): Promise<GenerationResult> {
        const pending = records.filter((record) => record.generationStatus !== 'ready')
        if (!pending.length) return { processed: 0, succeeded: 0, failed: 0, results: [], records }
        try {
            const generated = await OpenAIService.generateFlashcardData(
                pending.map((record) => record.word)
            )
            const updated = records.map((record) => {
                const item = generated.find(
                    (candidate) =>
                        candidate.word?.trim().toLocaleLowerCase() ===
                        record.word.toLocaleLowerCase()
                )
                if (!item)
                    return {
                        ...record,
                        generationStatus: 'failed' as const,
                        generationError: 'No generated data returned for this word'
                    }
                return {
                    ...record,
                    partOfSpeech: item.pos ?? null,
                    vietnamese: item.vietnamese ?? null,
                    ipa: item.ipa ?? null,
                    example: item.example ?? null,
                    cloze: record.cloze ?? record.word,
                    generationStatus: 'ready' as const,
                    generationError: null
                }
            })
            const results = updated.map((record) => ({
                id: record.id,
                status:
                    record.generationStatus === 'ready' ? ('ready' as const) : ('failed' as const),
                ...(record.generationError ? { error: record.generationError } : {})
            }))
            return {
                processed: pending.length,
                succeeded: results.filter((item) => item.status === 'ready').length,
                failed: results.filter((item) => item.status === 'failed').length,
                results,
                records: updated
            }
        } catch (error) {
            const message = failureMessage(error)
            const updated = records.map((record) =>
                record.generationStatus === 'ready'
                    ? record
                    : { ...record, generationStatus: 'failed' as const, generationError: message }
            )
            return {
                processed: pending.length,
                succeeded: 0,
                failed: pending.length,
                results: pending.map((record) => ({
                    id: record.id,
                    status: 'failed' as const,
                    error: message
                })),
                records: updated
            }
        }
    }
    static async generateMissingData(
        database: DatabaseRepositories,
        recordIds?: string[]
    ): Promise<GenerationResult> {
        const records = database.vocabulary
            .list()
            .filter((record) =>
                recordIds ? recordIds.includes(record.id) : record.generationStatus === 'pending'
            )
        const pending = records.filter((record) => record.generationStatus !== 'ready')
        if (pending.length === 0) return { processed: 0, succeeded: 0, failed: 0, results: [] }

        let generated: FlashcardResponse[]
        try {
            generated = await OpenAIService.generateFlashcardData(
                pending.map((record) => record.word)
            )
        } catch (error) {
            const message = failureMessage(error)
            logger.error('generation_batch_failed', { count: pending.length, error })
            const results = pending.map((record) => {
                database.transaction(() =>
                    database.vocabulary.update(record.id, {
                        generationStatus: 'failed',
                        generationError: message
                    })
                )
                return { id: record.id, status: 'failed' as const, error: message }
            })
            return { processed: pending.length, succeeded: 0, failed: pending.length, results }
        }

        const seen = new Set<string>()
        const results: GenerationResult['results'] = []
        for (const record of pending) {
            const item = generated.find(
                (candidate) => candidate.word?.trim().toLocaleLowerCase() === record.normalizedWord
            )
            const error = item
                ? validateGenerated(item)
                : 'No generated data returned for this word'
            if (error || !item) {
                logger.error('generation_record_validation_failed', {
                    id: record.id,
                    error: new Error(error ?? 'Generation failed')
                })
                database.transaction(() =>
                    database.vocabulary.update(record.id, {
                        generationStatus: 'failed',
                        generationError: error
                    })
                )
                results.push({
                    id: record.id,
                    status: 'failed',
                    error: error ?? 'Generation failed'
                })
                continue
            }

            if (seen.has(record.normalizedWord)) {
                const duplicateError = 'Duplicate generated data returned for this word'
                logger.error('generation_duplicate_failed', {
                    id: record.id,
                    error: new Error(duplicateError)
                })
                database.transaction(() =>
                    database.vocabulary.update(record.id, {
                        generationStatus: 'failed',
                        generationError: duplicateError
                    })
                )
                results.push({ id: record.id, status: 'failed', error: duplicateError })
                continue
            }

            seen.add(record.normalizedWord)
            try {
                database.transaction(() => {
                    database.vocabulary.update(record.id, {
                        partOfSpeech: item.pos,
                        vietnamese: item.vietnamese,
                        ipa: item.ipa ?? null,
                        example: item.example ?? null,
                        cloze:
                            record.cloze ??
                            (record.word.length <= 2
                                ? '_'.repeat(record.word.length)
                                : `${record.word[0]}${'_'.repeat(record.word.length - 2)}${record.word.at(-1)}`),
                        generationStatus: 'ready',
                        generationError: null
                    })
                })
                results.push({ id: record.id, status: 'ready' })
            } catch (error) {
                const message = failureMessage(error)
                logger.error('generation_record_persist_failed', { id: record.id, error })
                database.transaction(() =>
                    database.vocabulary.update(record.id, {
                        generationStatus: 'failed',
                        generationError: message
                    })
                )
                results.push({ id: record.id, status: 'failed', error: message })
            }
        }
        return {
            processed: pending.length,
            succeeded: results.filter((result) => result.status === 'ready').length,
            failed: results.filter((result) => result.status === 'failed').length,
            results
        }
    }
}
