import { OpenAIService } from './open-ai'
import { v4 as uuidv4 } from 'uuid'

interface Flashcard {
    id: string
    word: string
    pos?: string
    cloze?: string
    vietnamese: string
    ipa?: string
    image?: string
    audio_word?: string
}

export interface QuizNote {
    deckName: string
    modelName: string
    fields: Flashcard
    options: {
        allowDuplicate: boolean
    }
    audio?: {
        path: string
        filename: string
        fields: string[]
    }[]
}

export const createFlashcards = async (
    words: string[],
    audioDir: string,
    deckName: string,
    isAudio: boolean
) => {
    const dataFromOpenAI = await OpenAIService.generateFlashcardData(words)

    const notes: QuizNote[] = dataFromOpenAI.map((item) => {
        return {
            deckName,
            modelName: 'AnkiVNModel_Flashcard',
            fields: {
                ...item,
                id: uuidv4(),
                image: ''
            },
            options: {
                allowDuplicate: false
            },
            audio: isAudio
                ? [
                      {
                          path: `${audioDir}/${item.word}.mp3`,
                          filename: `${item.word}.mp3`,
                          fields: ['audio_word']
                      }
                  ]
                : []
        }
    })

    return notes
}
