import OpenAI from 'openai'
import { getRuntimeSetting } from './state/runtime'
import { OPENAI_DEFAULT_BASE_URL, OPENAI_DEFAULT_MODEL } from './database'
import { createLogger } from '../shared/logger'

export interface FlashcardResponse {
    word: string
    pos: string
    vietnamese: string
    ipa?: string
    example?: string
    imageQuery?: string
}
const logger = createLogger('main.open_ai')

export class OpenAIService {
    private static instance: OpenAI | null = null
    private static currentConfig: string | null = null
    private constructor() {
        // Singleton prevents direct construction.
    }
    public static getInstance(): OpenAI {
        const apiKey = getRuntimeSetting('openaiApiKey')
        const configuredBaseUrl = getRuntimeSetting('openaiBaseUrl')
        const configuredModel = getRuntimeSetting('openaiModel')
        const baseURL = configuredBaseUrl?.startsWith('http')
            ? configuredBaseUrl
            : OPENAI_DEFAULT_BASE_URL
        if (!apiKey) {
            throw new Error('Missing OpenAI API key in state')
        }
        const model =
            configuredModel && configuredModel !== apiKey ? configuredModel : OPENAI_DEFAULT_MODEL
        const configKey = `${apiKey}\u0000${baseURL}\u0000${model}`
        if (!this.instance || this.currentConfig !== configKey) {
            this.instance = new OpenAI({ apiKey, baseURL })
            this.currentConfig = configKey
        }
        return this.instance
    }
    public static async generateFlashcardData(words: string[]): Promise<FlashcardResponse[]> {
        const model =
            getRuntimeSetting('openaiModel') &&
            getRuntimeSetting('openaiModel') !== getRuntimeSetting('openaiApiKey')
                ? getRuntimeSetting('openaiModel')!
                : OPENAI_DEFAULT_MODEL

        logger.info('flashcard_generation_started', { wordCount: words.length, model })
        let completion
        try {
            completion = await this.getInstance().chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a high-performance dictionary data generator specialized in creating English learning flashcards. Output valid JSON with a data array containing word, pos, vietnamese, ipa, example, and imageQuery fields. For imageQuery, provide a short, visual English query of 2-5 words based on the meaning and example. For multiple-meaning words, choose the meaning shown by the example. Do not use IPA, Vietnamese, or a full sentence.'
                    },
                    { role: 'user', content: `List of words to process: ${JSON.stringify(words)}` }
                ],
                model,
                reasoning_effort: 'low',
                response_format: { type: 'json_object' }
            })
        } catch (error) {
            logger.error('flashcard_generation_request_failed', {
                wordCount: words.length,
                model,
                error: error instanceof Error ? error : new Error(String(error))
            })
            throw error
        }

        const content = completion.choices[0]?.message?.content
        logger.info('flashcard_generation_response_received', {
            wordCount: words.length,
            choiceCount: completion.choices.length,
            hasContent: Boolean(content),
            contentLength: content?.length ?? 0
        })
        if (!content) {
            const error = new Error('No content returned from GPT')
            logger.error('flashcard_generation_empty_response', { wordCount: words.length, error })
            throw error
        }

        let parsed: unknown
        try {
            parsed = JSON.parse(content)
        } catch (error) {
            logger.error('flashcard_generation_json_parse_failed', {
                wordCount: words.length,
                contentLength: content.length,
                error: error instanceof Error ? error : new Error(String(error))
            })
            throw error
        }

        if (
            !parsed ||
            typeof parsed !== 'object' ||
            !('data' in parsed) ||
            !Array.isArray(parsed.data)
        ) {
            const error = new Error('OpenAI response data is not an array')
            logger.error('flashcard_generation_invalid_shape', {
                wordCount: words.length,
                responseKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [],
                error
            })
            throw error
        }

        logger.info('flashcard_generation_completed', {
            requestedCount: words.length,
            generatedCount: parsed.data.length
        })
        return parsed.data as FlashcardResponse[]
    }
}
