import pLimit from 'p-limit'
import { v4 as uuidv4 } from 'uuid'
import {
    createNotionTargetQueueMap,
    shiftNotionTarget,
    type NotionSyncTarget
} from './helper/notion-sync'
import { sanitizeFilename } from './helper/sanitize-filename'
import { NotionService } from './notion'
import { OpenAIService } from './open-ai'
import { searchImagePexels } from './pexels'
import State from './state'

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
    notionTargets?: NotionSyncTarget[]
): Promise<QuizNote[]> => {
    const dataFromOpenAI = await OpenAIService.generateFlashcardData(words)
    const notionTargetsByWord = notionTargets
        ? createNotionTargetQueueMap(notionTargets)
        : undefined

    if (notionTargetsByWord) {
        const limit = pLimit(2)
        await Promise.allSettled(
            dataFromOpenAI.map((item) => {
                const target = shiftNotionTarget(notionTargetsByWord, item.word)
                if (!target) {
                    console.log(`Not found: ${item.word}`)
                    return Promise.resolve()
                }

                return limit(() => NotionService.update(target.pageId, item))
            })
        )
    }

    const pexelsToken = State.getToken('pexelsToken')
    const noteTargetsByWord = notionTargets ? createNotionTargetQueueMap(notionTargets) : undefined

    const notes = await Promise.all(
        dataFromOpenAI.map(async (item) => {
            let image: string | undefined
            if (pexelsToken) {
                image = (await searchImagePexels(pexelsToken, item.word)) || ''
            }

            const target = noteTargetsByWord
                ? shiftNotionTarget(noteTargetsByWord, item.word)
                : undefined

            return {
                deckName: target?.deckName ?? deckName,
                modelName: 'AnkiVNModel_Flashcard',
                fields: {
                    ...item,
                    id: uuidv4(),
                    image,
                    cloze: clozeWord(item.word)
                },
                options: {
                    allowDuplicate: false
                },
                audio: isAudio
                    ? [
                          {
                              path: `${audioDir}/${sanitizeFilename(item.word)}.mp3`,
                              filename: `${sanitizeFilename(item.word)}.mp3`,
                              fields: ['audio_word']
                          }
                      ]
                    : []
            }
        })
    )

    return notes
}
