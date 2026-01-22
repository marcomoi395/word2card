import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'fs'
import path, { join } from 'path'
import icon from '../../resources/icon.png?asset'
import type { FileImport, NotionSync } from '../preload/index.d'
import { checkAnkiConnect, sendRequest } from './anki-connect'
import { createFlashcards, QuizNote } from './handle'
import { filterExistingWords } from './helper/filter-existing-words'
import { ModelFlashcard } from './helper/model-flashcard.interface'
import { readFileContent } from './helper/readFile'
import { SpeechService } from './speech'
import State, { TokenMap } from './state'
import SecretManager from './store'
import { NotionService } from './notion'
import { getWordsFromResponse } from './helper/get-words-from-notion-response'
import { PageObjectResponse } from '@notionhq/client'

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false,
        show: false,
        resizable: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    // mainWindow.webContents.openDevTools()
    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })
    mainWindow.loadFile('index.html')

    ipcMain.on('window-minimize', () => {
        mainWindow.minimize()
    })

    ipcMain.on('window-close', () => {
        mainWindow.close()
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

const init = async (audioDir: string): Promise<void | { status: string; message: string }> => {
    // Check audio folder
    if (!fs.existsSync(audioDir)) {
        try {
            fs.mkdirSync(audioDir, { recursive: true })
        } catch (err) {
            console.error('', err)
        }
    }

    // Create default models if not exist
    const modelsResponse = (await sendRequest({
        action: 'findModelsByName',
        version: 6,
        params: {
            modelNames: ['AnkiVNModel_Flashcard']
        }
    })) as { result: (object & { name: string })[]; error: string | null }

    let models: string[] = []

    if (modelsResponse.result !== null) {
        models = modelsResponse.result.map((i) => i.name)
    }

    const rawData = fs.readFileSync(path.join(__dirname, './helper/model-flashcard.json'), 'utf-8')
    const modelFlashcardParams = JSON.parse(rawData) as ModelFlashcard

    if (models.indexOf('AnkiVNModel_Flashcard') === -1) {
        try {
            await sendRequest({
                action: 'createModel',
                version: 6,
                params: modelFlashcardParams
            })
        } catch (_err) {
            return {
                status: 'error',
                message: 'Failed to create flashcard model.'
            }
        }
    }
}

const createDeckIfNotExist = async (deckName: string) => {
    const decks = (await sendRequest({
        action: 'deckNames',
        version: 6
    })) as { result: string[]; error: string | null }

    if (decks.result.includes(deckName)) {
        return
    }

    await sendRequest({
        action: 'createDeck',
        version: 6,
        params: {
            deck: deckName
        }
    })
}

const loadTokensToState = () => {
    const tokens: TokenMap = {
        openaiApiKey: SecretManager.getSecret('openaiApiKey') as string,
        azureApiKey: SecretManager.getSecret('azureApiKey') as string,
        unsplashAccessKey: SecretManager.getSecret('unsplashAccessKey') as string,
        notionToken: SecretManager.getSecret('notionToken') as string,
        notionDatabaseId: SecretManager.getSecret('notionDatabaseId') as string
    }

    State.setAllTokens(tokens)
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.youngmarco.word2card')
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })
    loadTokensToState()

    ipcMain.handle('open-file-dialog', async () => {
        const { filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Text Files', extensions: ['txt'] }]
        })

        if (filePaths.length > 0) {
            const content = fs.readFileSync(filePaths[0], 'utf8')
            return { content, filePath: filePaths[0] }
        }
        return { content: null, filePath: null }
    })

    ipcMain.handle(
        'save-settings',
        async (
            _,
            payload: { openaiApiKey: string; azureApiKey: string; unsplashAccessKey: string }
        ) => {
            try {
                let s1: boolean = true
                let s2: boolean = true
                let s3: boolean = true

                if (payload.openaiApiKey) {
                    s1 = SecretManager.saveSecret('openaiApiKey', payload.openaiApiKey.trim())
                    State.setToken('openaiApiKey', payload.openaiApiKey.trim())
                } else {
                    SecretManager.deleteSecret('openaiApiKey')
                    State.removeToken('openaiApiKey')
                }

                if (payload.azureApiKey) {
                    s2 = SecretManager.saveSecret('azureApiKey', payload.azureApiKey.trim())
                    State.setToken('azureApiKey', payload.azureApiKey.trim())
                } else {
                    SecretManager.deleteSecret('azureApiKey')
                    State.removeToken('azureApiKey')
                }

                if (payload.unsplashAccessKey) {
                    s3 = SecretManager.saveSecret(
                        'unsplashAccessKey',
                        payload.unsplashAccessKey.trim()
                    )
                    State.setToken('unsplashAccessKey', payload.unsplashAccessKey.trim())
                } else {
                    SecretManager.deleteSecret('unsplashAccessKey')
                    State.removeToken('unsplashAccessKey')
                }

                if (!s1 || !s2 || !s3) {
                    throw new Error('Save failed')
                }

                return { status: 'success' }
            } catch (error) {
                return {
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error occurred'
                }
            }
        }
    )

    ipcMain.handle('get-secret', async () => {
        const openaiApiKey = State.getToken('openaiApiKey') || ''
        const azureApiKey = State.getToken('azureApiKey') || ''
        const unsplashAccessKey = State.getToken('unsplashAccessKey') || ''
        const notionToken = State.getToken('notionToken') || ''
        const notionDatabaseId = State.getToken('notionDatabaseId') || ''

        return {
            status: 'success',
            message: 'Secrets retrieved successfully',
            data: {
                openaiApiKey,
                azureApiKey,
                unsplashAccessKey,
                notionToken,
                notionDatabaseId
            }
        }
    })

    ipcMain.handle('send-import', async (_, importData: FileImport | NotionSync) => {
        // Check openaiApiKey
        State.getMissingTokens(['openaiApiKey'])

        if (State.getMissingTokens(['openaiApiKey']).includes('openaiApiKey')) {
            return {
                status: 'error',
                message: 'OpenAI API key is missing. Please set it in the settings.'
            }
        }

        if ((await checkAnkiConnect()) === false) {
            return {
                status: 'error',
                message:
                    'AnkiConnect is not running. Please start Anki and ensure AnkiConnect is installed.'
            }
        }

        //Save token and databaseId if type is NOTION_SYNC
        if (importData.type === 'NOTION_SYNC') {
            SecretManager.saveSecret('notionToken', importData.payload.token)
            SecretManager.saveSecret('notionDatabaseId', importData.payload.databseId)
        }

        // Initialize folders and models
        const pathFile = path.join(app.getPath('userData'))
        const audioDir = path.join(pathFile, 'audio')
        void (await init(audioDir))

        let words: string[] | null = []
        switch (importData.type) {
            case 'FILE_IMPORT': {
                const rawData: string[] | null = await readFileContent(importData.payload.filePath)
                if (rawData === null) {
                    break
                }

                words = await filterExistingWords(rawData)
                break
            }

            case 'NOTION_SYNC': {
                try {
                    State.setToken('notionToken', importData.payload.token)
                    const pages = (await NotionService.getPages(
                        importData.payload.databseId
                    )) as PageObjectResponse[]

                    if (pages.length === 0) {
                        return {
                            status: 'error',
                            message: 'No pages found in the Notion database.'
                        }
                    }
                    words = getWordsFromResponse(pages)
                    break
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : 'Error retrieving data from Notion, please check your token and database ID.'

                    return {
                        status: 'error',
                        message
                    }
                }
            }
            default:
                return {
                    status: 'error',
                    message: 'Unknown import data type.'
                }
        }

        if (words === null) {
            return {
                status: 'error',
                message: 'Failed to read words from the source.'
            }
        }

        let isAudio: boolean = false
        const isAzureKey = SecretManager.getSecret('azureApiKey')
        if (isAzureKey) {
            isAudio = true
            const result = await SpeechService.createSpeechFiles(words, audioDir)
            if (result.length !== words.length) {
                return {
                    status: 'error',
                    message: "Some audio files couldn't be created, please try again."
                }
            }
        }

        // Check existing deck and create if not exist
        if (importData.payload.deck === '') {
            importData.payload.deck = `Vocabulary::Imported::${new Date().toISOString().split('T')[0]}`
        }
        createDeckIfNotExist(importData.payload.deck)

        const notes: QuizNote[] = []

        if (importData.payload.options.flashcard) {
            const newNotes = await createFlashcards(
                words,
                audioDir,
                importData.payload.deck,
                isAudio
            )
            notes.push(...newNotes)
        }

        if (notes.length > 0) {
            const result = (await sendRequest({
                action: 'addNotes',
                version: 6,
                params: {
                    notes: notes
                }
            })) as { result: string | null; error: string }

            if (result.error === null) {
                return {
                    status: 'success'
                }
            } else {
                return {
                    status: 'error',
                    error: result.error
                }
            }
        } else {
            return {
                satus: 'error',
                message: 'No cards to add.'
            }
        }
    })

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
