import type { DatabaseRepositories, VocabularyRecord } from '../database'
import { OpenAIService, type FlashcardResponse } from '../open-ai'
import type { GenerationSummary } from '../../shared/ipc'

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

        const byWord = new Map(pending.map((record) => [record.normalizedWord, record]))
        let generated: FlashcardResponse[]
        try {
            generated = await OpenAIService.generateFlashcardData(pending.map((record) => record.word))
        } catch (error) {
            const message = failureMessage(error)
            const results = pending.map((record) => {
                database.transaction(() => database.vocabulary.update(record.id, { generationStatus: 'failed', generationError: message }))
                return { id: record.id, status: 'failed' as const, error: message }
            })
            return { processed: pending.length, succeeded: 0, failed: pending.length, results }
        }

        const seen = new Set<string>()
        const results: GenerationResult['results'] = []
        for (const record of pending) {
            const item = generated.find((candidate) => candidate.word?.trim().toLocaleLowerCase() === record.normalizedWord)
            const error = item ? validateGenerated(item) : 'No generated data returned for this word'
            if (error || !item) {
                database.transaction(() => database.vocabulary.update(record.id, { generationStatus: 'failed', generationError: error }))
                results.push({ id: record.id, status: 'failed', error: error ?? 'Generation failed' })
                continue
            }
            if (seen.has(record.normalizedWord)) {
                const duplicateError = 'Duplicate generated data returned for this word'
                database.transaction(() => database.vocabulary.update(record.id, { generationStatus: 'failed', generationError: duplicateError }))
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
                        cloze: record.cloze ?? (record.word.length <= 2 ? '_'.repeat(record.word.length) : `${record.word[0]}${'_'.repeat(record.word.length - 2)}${record.word.at(-1)}`),
                        generationStatus: 'ready',
                        generationError: null
                    })
                })
                results.push({ id: record.id, status: 'ready' })
            } catch (error) {
                const message = failureMessage(error)
                database.transaction(() => database.vocabulary.update(record.id, { generationStatus: 'failed', generationError: message }))
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
