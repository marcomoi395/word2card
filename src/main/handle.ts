import { v4 as uuidv4 } from 'uuid'
import {
    createNotionTargetQueueMap,
    shiftNotionTarget,
    type NotionSyncTarget
} from './helper/notion-sync'
import { sanitizeFilename } from './helper/sanitize-filename'
import { OpenAIService } from './open-ai'
import { searchImagePexels } from './pexels'
import { getRuntimeSetting } from './state/runtime'

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
interface ImageSearchInput {
    word: string
    pos?: string
    imageQuery?: string
}

export const imageSearchQueries = ({ word, pos, imageQuery }: ImageSearchInput): string[] =>
    [imageQuery, pos ? `${word} ${pos}` : undefined, word].filter((query): query is string =>
        Boolean(query?.trim())
    )

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

export const normalizeIpa = (ipa: string | undefined): string | undefined => {
    if (!ipa) {
        return undefined
    }
    return ipa.trim().replace(/^\/+|\/+$/g, '') || undefined
}

export const clozeWord = (word: string): string => {
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

    const pexelsToken = getRuntimeSetting('pexelsToken')
    const noteTargetsByWord = notionTargets ? createNotionTargetQueueMap(notionTargets) : undefined

    const notes = await Promise.all(
        dataFromOpenAI.map(async (item) => {
            const { imageQuery, ...flashcard } = item
            let image: string | undefined
            if (pexelsToken) {
                image =
                    (await searchImagePexels(
                        pexelsToken,
                        imageSearchQueries({ ...flashcard, imageQuery })
                    )) || ''
            }
            const target = noteTargetsByWord
                ? shiftNotionTarget(noteTargetsByWord, item.word)
                : undefined

            return {
                deckName: target?.deckName ?? deckName,
                modelName: 'AnkiVNModel_Flashcard',
                fields: {
                    ...flashcard,
                    id: uuidv4(),
                    ipa: normalizeIpa(item.ipa),
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
