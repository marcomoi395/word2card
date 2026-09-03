import { sendRequest } from '../anki-connect'
import { createLogger } from '../../shared/logger'

const logger = createLogger('main.filter_existing_words')

export async function filterExistingWords(
    words: string[],
    fieldName: string = 'word'
): Promise<string[]> {
    try {
        if (words.length === 0) {
            logger.debug('word_filter_skipped', { reason: 'empty_input' })
            return []
        }

        const actions = words.map((word) => ({
            action: 'findNotes',
            params: {
                query: `${fieldName}:${word}`
            }
        }))

        const response = await sendRequest<number[][]>({
            action: 'multi',
            version: 6,
            params: { actions }
        })

        if (response.error) {
            throw new Error(response.error)
        }

        const filteredWords = words.filter((_, index) => {
            const resultForWord = response.result[index]
            return resultForWord && resultForWord.length === 0
        })
        logger.info('word_filter_completed', {
            inputCount: words.length,
            outputCount: filteredWords.length
        })
        return filteredWords
    } catch (error) {
        logger.error('word_filter_failed', {
            error: error instanceof Error ? error : new Error(String(error)),
            inputCount: words.length
        })
        return words
    }
}
