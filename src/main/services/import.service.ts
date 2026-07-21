import { app } from 'electron'
import path from 'path'
import { checkAnkiConnect } from '../anki-connect'
import { createFlashcards, type QuizNote } from '../handle'
import { NotionService } from '../notion'
import { SpeechService } from '../speech'
import State from '../state'
import type { ImportRequest, AppResponse, SecretKey } from '../../shared/ipc'
import { success, failure } from '../utils/response'
import SecretManager from '../store'
import { filterExistingWords } from '../helper/filter-existing-words'
import { readFileContent } from '../helper/readFile'
import { getWordEntriesFromResponse } from '../helper/get-words-from-notion-response'
import {
    filterNotionTargetsByWords,
    resolveNotionDeckName,
    type NotionSyncTarget
} from '../helper/notion-sync'
import { DeckService } from './deck.service'
import { existsSync, mkdirSync } from 'fs'

const syncRuntimeSecret = (key: SecretKey, value: string): boolean => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
        return false
    }

    const saved = SecretManager.saveSecret(key, trimmedValue)
    if (saved) {
        State.setToken(key, trimmedValue)
    }
    return saved
}

const ensureAudioDirectory = (audioDir: string): void => {
    if (!existsSync(audioDir)) {
        mkdirSync(audioDir, { recursive: true })
    }
}

const resolveDeckName = (deckName: string): string => {
    const trimmedDeck = deckName.trim()
    if (trimmedDeck) {
        return trimmedDeck
    }
    return `Vocabulary::Imported::${new Date().toISOString().split('T')[0]}`
}

export class ImportService {
    private static async init(audioDir: string): Promise<AppResponse> {
        try {
            ensureAudioDirectory(audioDir)
            return success()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown initialization error'
            return failure(message)
        }
    }

    private static async loadWords(
        importRequest: ImportRequest
    ): Promise<AppResponse<{ notionTargets?: NotionSyncTarget[]; words: string[] }>> {
        if (importRequest.type === 'FILE_IMPORT') {
            const rawData = await readFileContent(importRequest.payload.filePath)
            if (rawData === null) {
                return failure('Failed to read words from the source.')
            }

            return success({
                words: await filterExistingWords(rawData)
            })
        }

        try {
            const savedNotionToken = syncRuntimeSecret('notionToken', importRequest.payload.token)
            const savedNotionDatabaseId = syncRuntimeSecret(
                'notionDatabaseId',
                importRequest.payload.notionDatabaseId
            )

            if (!savedNotionToken || !savedNotionDatabaseId) {
                return failure('Failed to save Notion settings.')
            }

            const dataSources = await NotionService.getPages(importRequest.payload.notionDatabaseId)
            if (!dataSources || dataSources.length === 0) {
                return failure('No pages found in the Notion database.')
            }

            const notionTargets = dataSources.flatMap((dataSource) =>
                /* v8 ignore next */
                getWordEntriesFromResponse(dataSource.pages).map((entry) => ({
                    pageId: entry.pageId,
                    word: entry.word,
                    deckName: resolveNotionDeckName(
                        importRequest.payload.deck,
                        dataSource.dataSourceName
                    )
                }))
            )
            const words = await filterExistingWords(notionTargets.map((target) => target.word))

            return success({
                notionTargets: filterNotionTargetsByWords(notionTargets, words),
                words
            })
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Error retrieving data from Notion, please check your token and database ID.'
            return failure(message)
        }
    }

    private static async createNotes(
        importRequest: ImportRequest,
        words: string[],
        audioDir: string,
        notionTargets?: NotionSyncTarget[]
    ): Promise<AppResponse<QuizNote[]>> {
        const isAudioEnabled = Boolean(State.getToken('azureApiKey'))
        if (isAudioEnabled) {
            const speechFiles = await SpeechService.createSpeechFiles(words, audioDir)
            if (speechFiles.length !== words.length) {
                return failure("Some audio files couldn't be created, please try again.")
            }
        }

        const deckNames =
            importRequest.type === 'NOTION_SYNC' && notionTargets
                /* v8 ignore start */
                ? notionTargets.map((target) => target.deckName)
                : [resolveDeckName(importRequest.payload.deck)]
                /* v8 ignore stop */
        const deckResult = await DeckService.createDecksIfNotExist(deckNames)
        if (deckResult.status === 'error') {
            return deckResult
        }

        const notes: QuizNote[] = []
        if (importRequest.payload.options.flashcard) {
            const newNotes = await createFlashcards(
                words,
                audioDir,
                deckNames[0] || resolveDeckName(importRequest.payload.deck),
                isAudioEnabled,
                notionTargets
            )
            notes.push(...newNotes)
        }

        if (notes.length === 0) {
            return failure('No cards to add.')
        }

        return success(notes)
    }

    public static async handleImportRequest(importRequest: ImportRequest): Promise<AppResponse> {
        const missingTokens = State.getMissingTokens(['openaiApiKey'])
        if (missingTokens.includes('openaiApiKey')) {
            return failure('OpenAI API key is missing. Please set it in the settings.')
        }

        if ((await checkAnkiConnect()) === false) {
            return failure(
                'AnkiConnect is not running. Please start Anki and ensure AnkiConnect is installed.'
            )
        }

        const audioDir = path.join(app.getPath('userData'), 'audio')
        const initResult = await ImportService.init(audioDir)
        if (initResult.status === 'error') {
            return initResult
        }

        const loadedWordsResult = await ImportService.loadWords(importRequest)
        if (loadedWordsResult.status === 'error') {
            return loadedWordsResult
        }

        if (!loadedWordsResult.data) {
            return failure('Failed to load words from the source.')
        }

        const { words, notionTargets } = loadedWordsResult.data
        const notesResult = await ImportService.createNotes(
            importRequest,
            words,
            audioDir,
            notionTargets
        )
        if (notesResult.status === 'error') {
            return notesResult
        }

        if (!notesResult.data) {
            return failure('Failed to create notes.')
        }

        return DeckService.addNotesToAnki(notesResult.data)
    }
}
