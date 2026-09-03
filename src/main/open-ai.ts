import OpenAI from 'openai'
import { getRuntimeSetting } from './state/runtime'
import { OPENAI_DEFAULT_BASE_URL, OPENAI_DEFAULT_MODEL } from './database'

export interface FlashcardResponse {
    word: string
    pos: string
    vietnamese: string
    ipa?: string
    example?: string
    audio_word?: string
}

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
        const completion = await this.getInstance().chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a high-performance dictionary data generator specialized in creating English learning flashcards. Output valid JSON with a data array containing word, pos, vietnamese, ipa, and example fields.'
                },
                { role: 'user', content: `List of words to process: ${JSON.stringify(words)}` }
            ],
            model,
            reasoning_effort: 'low',
            response_format: { type: 'json_object' }
        })
        const content = completion.choices[0].message.content
        if (!content) {
            throw new Error('No content returned from GPT')
        }
        return (JSON.parse(content) as { data: FlashcardResponse[] }).data
    }
}
