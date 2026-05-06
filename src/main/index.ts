import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'fs'
import path, { join } from 'path'
import icon from '../../resources/icon.png?asset'
import type {
    AppResponse,
    ImportOptions,
    ImportRequest,
    OpenFileDialogData,
    SaveSettingsPayload,
    SecretKey,
    SecretsData
} from '../shared/ipc'
import { IPC_CHANNELS } from '../shared/ipc'
import { checkAnkiConnect, sendRequest } from './anki-connect'
import { createFlashcards, QuizNote } from './handle'
import { filterExistingWords } from './helper/filter-existing-words'
import { getWordEntriesFromResponse } from './helper/get-words-from-notion-response'
import {
    filterNotionTargetsByWords,
    resolveNotionDeckName,
    type NotionSyncTarget
} from './helper/notion-sync'
import modelFlashcardParams from './helper/model-flashcard.json'
import { readFileContent } from './helper/readFile'
import { NotionService } from './notion'
import { SpeechService } from './speech'
import State, { TokenMap } from './state'
import SecretManager from './store'

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false,
        show: false,
        resizable: false,
        movable: true,
        icon,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    ipcMain.on(IPC_CHANNELS.windowMinimize, () => {
        mainWindow.minimize()
    })

    ipcMain.on(IPC_CHANNELS.windowClose, () => {
        mainWindow.close()
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

const success = <T>(data?: T, message?: string): AppResponse<T> => {
    return {
        status: 'success',
        ...(data === undefined ? {} : { data }),
        ...(message ? { message } : {})
    }
}

const failure = (message: string): AppResponse => ({
    status: 'error',
    message
})

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null
}

const isImportOptions = (value: unknown): value is ImportOptions => {
    return (
        isRecord(value) && typeof value.quiz === 'boolean' && typeof value.flashcard === 'boolean'
    )
}

const parseSaveSettingsPayload = (value: unknown): SaveSettingsPayload | null => {
    if (!isRecord(value)) {
        return null
    }

    if (
        typeof value.openaiApiKey !== 'string' ||
        typeof value.azureApiKey !== 'string' ||
        typeof value.pexelsToken !== 'string'
    ) {
        return null
    }

    return {
        openaiApiKey: value.openaiApiKey,
        azureApiKey: value.azureApiKey,
        pexelsToken: value.pexelsToken
    }
}

const parseImportRequest = (value: unknown): ImportRequest | null => {
    if (!isRecord(value) || typeof value.type !== 'string' || !isRecord(value.payload)) {
        return null
    }

    const { payload } = value
    if (typeof payload.deck !== 'string' || !isImportOptions(payload.options)) {
        return null
    }

    if (value.type === 'FILE_IMPORT') {
        if (typeof payload.filePath !== 'string') {
            return null
        }

        return {
            type: 'FILE_IMPORT',
            payload: {
                filePath: payload.filePath,
                deck: payload.deck,
                options: payload.options
            }
        }
    }

    if (value.type === 'NOTION_SYNC') {
        if (typeof payload.token !== 'string' || typeof payload.notionDatabaseId !== 'string') {
            return null
        }

        return {
            type: 'NOTION_SYNC',
            payload: {
                token: payload.token,
                notionDatabaseId: payload.notionDatabaseId,
                deck: payload.deck,
                options: payload.options
            }
        }
    }

    return null
}

const syncRuntimeSecret = (key: SecretKey, value: string): boolean => {
    const trimmedValue = value.trim()
    if (trimmedValue.length === 0) {
        SecretManager.deleteSecret(key)
        State.removeToken(key)
        return true
    }

    const isSaved = SecretManager.saveSecret(key, trimmedValue)
    if (isSaved) {
        State.setToken(key, trimmedValue)
    }
    return isSaved
}

const loadTokensToState = () => {
    const tokens: TokenMap = {
        openaiApiKey: SecretManager.getSecret('openaiApiKey') ?? undefined,
        azureApiKey: SecretManager.getSecret('azureApiKey') ?? undefined,
        pexelsToken: SecretManager.getSecret('pexelsToken') ?? undefined,
        notionToken: SecretManager.getSecret('notionToken') ?? undefined,
        notionDatabaseId: SecretManager.getSecret('notionDatabaseId') ?? undefined
    }

    State.setAllTokens(tokens)
}

const ensureAudioDirectory = (audioDir: string): void => {
    if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true })
    }
}

const init = async (audioDir: string): Promise<AppResponse> => {
    try {
        ensureAudioDirectory(audioDir)

        const modelsResponse = await sendRequest<Array<string | { name?: string }>>({
            action: 'findModelsByName',
            version: 6,
            params: {
                modelNames: ['AnkiVNModel_Flashcard']
            }
        })

        if (modelsResponse.error) {
            throw new Error(modelsResponse.error)
        }

        const models = modelsResponse.result
            .map((item) => (typeof item === 'string' ? item : item.name))
            .filter((item): item is string => Boolean(item))

        if (!models.includes('AnkiVNModel_Flashcard')) {
            const createModelResponse = await sendRequest<null>({
                action: 'createModel',
                version: 6,
                params: modelFlashcardParams as Record<string, unknown>
            })

            if (createModelResponse.error) {
                throw new Error(createModelResponse.error)
            }
        }

        return success()
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to initialize runtime.'
        return failure(message)
    }
}

const createDeckIfNotExist = async (deckName: string): Promise<AppResponse> => {
    const decksResponse = await sendRequest<string[]>({
        action: 'deckNames',
        version: 6
    })

    if (decksResponse.error) {
        return failure(decksResponse.error)
    }

    if (decksResponse.result.includes(deckName)) {
        return success()
    }

    const createDeckResponse = await sendRequest<null>({
        action: 'createDeck',
        version: 6,
        params: {
            deck: deckName
        }
    })

    if (createDeckResponse.error) {
        return failure(createDeckResponse.error)
    }

    return success()
}

const getSecretsData = (): SecretsData => ({
    openaiApiKey: State.getToken('openaiApiKey') || '',
    azureApiKey: State.getToken('azureApiKey') || '',
    pexelsToken: State.getToken('pexelsToken') || '',
    notionToken: State.getToken('notionToken') || '',
    notionDatabaseId: State.getToken('notionDatabaseId') || ''
})

const resolveDeckName = (deckName: string): string => {
    const trimmedDeck = deckName.trim()
    if (trimmedDeck) {
        return trimmedDeck
    }

    return `Vocabulary::Imported::${new Date().toISOString().split('T')[0]}`
}

const createDecksIfNotExist = async (deckNames: string[]): Promise<AppResponse> => {
    for (const deckName of new Set(deckNames)) {
        const deckResult = await createDeckIfNotExist(deckName)
        if (deckResult.status === 'error') {
            return deckResult
        }
    }

    return success()
}

const loadWords = async (
    importRequest: ImportRequest
): Promise<AppResponse<{ notionTargets?: NotionSyncTarget[]; words: string[] }>> => {
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

const createNotes = async (
    importRequest: ImportRequest,
    words: string[],
    audioDir: string,
    notionTargets?: NotionSyncTarget[]
 ): Promise<AppResponse<QuizNote[]>> => {
    const isAudioEnabled = Boolean(State.getToken('azureApiKey'))
    if (isAudioEnabled) {
        const speechFiles = await SpeechService.createSpeechFiles(words, audioDir)
        if (speechFiles.length !== words.length) {
            return failure("Some audio files couldn't be created, please try again.")
        }
    }

    const deckNames =
        importRequest.type === 'NOTION_SYNC' && notionTargets
            ? notionTargets.map((target) => target.deckName)
            : [resolveDeckName(importRequest.payload.deck)]
    const deckResult = await createDecksIfNotExist(deckNames)
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

const addNotesToAnki = async (notes: QuizNote[]): Promise<AppResponse> => {
    const result = await sendRequest<(number | null)[]>({
        action: 'addNotes',
        version: 6,
        params: {
            notes
        }
    })

    if (result.error) {
        return failure(result.error)
    }

    return success()
}

const handleImportRequest = async (importRequest: ImportRequest): Promise<AppResponse> => {
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
    const initResult = await init(audioDir)
    if (initResult.status === 'error') {
        return initResult
    }

    const loadedWordsResult = await loadWords(importRequest)
    if (loadedWordsResult.status === 'error') {
        return loadedWordsResult
    }

    if (!loadedWordsResult.data) {
        return failure('Failed to load words from the source.')
    }

    const { words, notionTargets } = loadedWordsResult.data
    const notesResult = await createNotes(importRequest, words, audioDir, notionTargets)
    if (notesResult.status === 'error') {
        return notesResult
    }

    if (!notesResult.data) {
        return failure('Failed to create notes.')
    }

    return addNotesToAnki(notesResult.data)
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.youngmarco.word2card')
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    loadTokensToState()

    ipcMain.handle(
        IPC_CHANNELS.openFileDialog,
        async (): Promise<AppResponse<OpenFileDialogData>> => {
            const { filePaths } = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: 'Text Files', extensions: ['txt'] }]
            })

            return success({
                filePath: filePaths[0] ?? null
            })
        }
    )

    ipcMain.handle(IPC_CHANNELS.saveSettings, async (_, payload: unknown): Promise<AppResponse> => {
        const parsedPayload = parseSaveSettingsPayload(payload)
        if (!parsedPayload) {
            return failure('Invalid settings payload.')
        }

        const secretKeys: Array<keyof SaveSettingsPayload> = [
            'openaiApiKey',
            'azureApiKey',
            'pexelsToken'
        ]

        for (const key of secretKeys) {
            const isSaved = syncRuntimeSecret(key, parsedPayload[key])
            if (!isSaved) {
                return failure('Save failed')
            }
        }

        return success(undefined, 'Settings saved successfully.')
    })

    ipcMain.handle(IPC_CHANNELS.getSecret, async (): Promise<AppResponse<SecretsData>> => {
        return success(getSecretsData(), 'Secrets retrieved successfully')
    })

    ipcMain.handle(
        IPC_CHANNELS.sendImport,
        async (_, importData: unknown): Promise<AppResponse> => {
            const parsedImportRequest = parseImportRequest(importData)
            if (!parsedImportRequest) {
                return failure('Invalid import payload.')
            }

            try {
                return await handleImportRequest(parsedImportRequest)
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error occurred'
                return failure(message)
            }
        }
    )

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
