import { v4 as uuidv4 } from 'uuid'
import State from './state'
import { NotionService } from './notion'
import { OpenAIService } from './open-ai'
import { searchImagePexels } from './pexels'

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

const clozeWord = (word: string): string => {
    if (word.length <= 2) {
        return '_'.repeat(word.length)
    }

    const firstChar = word.charAt(0)
    const lastChar = word.charAt(word.length - 1)
    const middle = '_'.repeat(word.length - 2)
    return firstChar + middle + lastChar
}

export const createFlashcards = async (
    words: string[],
    audioDir: string,
    deckName: string,
    isAudio: boolean,
    type: string
): Promise<QuizNote[]> => {
    const dataFromOpenAI = await OpenAIService.generateFlashcardData(words)
    // Save data to Notion if needed
    if (type === 'NOTION_SYNC') {
        const notionDatabaseId = State.getToken('notionDatabaseId') || ''
        await NotionService.updatePages(notionDatabaseId, dataFromOpenAI)
    }
    const pexelsToken = State.getToken('pexelsToken')

    const notes = await Promise.all(
        dataFromOpenAI.map(async (item) => {
            let image: string | undefined
            if (pexelsToken) {
                image = (await searchImagePexels(pexelsToken, item.word)) || ''
            }

            const cloze = clozeWord(item.word)

            return {
                deckName,
                modelName: 'AnkiVNModel_Flashcard',
                fields: {
                    ...item,
                    id: uuidv4(),
                    image,
                    cloze
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
    )

    return notes
}
