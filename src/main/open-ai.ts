import OpenAI from 'openai'
import State from './state'

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
    private static currentKey: string | null = null

    private constructor() {
        // Prevent direct instantiation
    }

    public static getInstance(): OpenAI {
        const newKey = State.getToken('openaiApiKey')

        if (!newKey) {
            throw new Error('Missing OpenAI API key in state')
        }

        if (!OpenAIService.instance || OpenAIService.currentKey !== newKey) {
            OpenAIService.instance = new OpenAI({
                apiKey: newKey
            })

            OpenAIService.currentKey = newKey
        }

        return OpenAIService.instance
    }

    public static async generateFlashcardData(words: string[]) {
        const MODEL_NAME = 'gpt-5-nano'
        const systemPrompt = `
            You are a high-performance dictionary data generator specialized in creating English learning flashcards.
            Your task is to generate accurate, concise flashcard data for a list of English words.

            Output strictly in **valid JSON format** with no additional text or explanations.
            The output must be an object containing a single key "data", which is an array of objects.

            Each object in the "data" array must follow this structure:
            {
            "word": "The original input word (lowercase, base form)",
            "pos": "Part of speech abbreviation (noun, verb, adj, adv, phrase, etc.)",
            "vietnamese": "The most common Vietnamese meaning (1-3 words, no extra explanation)",
            "ipa": "IPA pronunciation in American English format",
            "example": "A simple, natural example sentence using the word in context"
            }

            ### Guidelines:
            - "pos": Use standard abbreviations: noun, verb, adj, adv, phrase, phrasal verb, preposition
            - "vietnamese": Keep it short and practical (e.g., "chạy" not "hành động di chuyển nhanh")
            - "ipa": Use standard American English IPA notation with stress marks
            - "example": Use simple, everyday language; the word should be clearly demonstrated in context
            - If a word has multiple meanings, choose the most common one
            - Ensure all JSON is properly formatted with commas and quotes

            ### Example Interaction
            User Input: ["apple", "run"]
            Assistant Output:
            {
            "data": [
                {
                "word": "apple",
                "pos": "noun",
                "vietnamese": "quả táo",
                "ipa": "ˈæp.əl",
                "example": "I ate an apple for breakfast."
                },
                {
                "word": "run",
                "pos": "verb",
                "vietnamese": "chạy",
                "ipa": "rʌn",
                "example": "I run every morning to stay fit."
                }
            ]
            }

            Remember: Output ONLY the JSON object. No additional text before or after.
        `

        const userPrompt = `List of words to process: ${JSON.stringify(words)}`
        const openai = OpenAIService.getInstance()

        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: MODEL_NAME,
            reasoning_effort: 'minimal',
            response_format: { type: 'json_object' }
        })

        const content = completion.choices[0].message.content

        if (!content) {
            throw new Error('No content returned from GPT')
        }

        const result = JSON.parse(content) as { data: FlashcardResponse[] }
        return result.data
    }
}
