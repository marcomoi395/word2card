import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import fs from 'fs'
import path, { join } from 'path'
import icon from '../../resources/icon.png?asset'
import type { FileImport, NotionSync } from '../preload/index.d'
import { checkAnkiConnect, sendRequest } from './anki-connect'
import { createFlashcards, QuizNote } from './handle'
import { modelFlashcardParams } from './helper/modelFlashcard'
import { readFileContent } from './helper/readFile'
import { SpeechService } from './speech'
import 'dotenv/config'
import SecretManager from './store'

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    mainWindow.webContents.openDevTools()
    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

const init = async (audioDir: string) => {
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

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.youngmarco.word2card')
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    ipcMain.handle('save-settings', async (_, payload: { openaiKey: string; azureKey: string }) => {
        try {
            let s1: boolean = true
            let s2: boolean = true

            if (payload.openaiKey) {
                s1 = SecretManager.saveSecret('openaiApiKey', payload.openaiKey.trim())
            } else {
                SecretManager.deleteSecret('openaiApiKey')
            }

            if (payload.openaiKey) {
                s2 = SecretManager.saveSecret('azureApiKey', payload.azureKey.trim())
            } else {
                SecretManager.deleteSecret('azureApiKey')
            }

            if (!s1 || !s2) {
                throw new Error('Save failed')
            }

            return { status: 'success' }
        } catch (error) {
            return {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    })

    ipcMain.handle('get-secret', async () => {
        const openaiApiKey = SecretManager.getSecret('openaiApiKey') || ''
        const azureApiKey = SecretManager.getSecret('azureApiKey') || ''

        return {
            status: 'success',
            message: 'Secrets retrieved successfully',
            data: {
                openaiApiKey,
                azureApiKey
            }
        }
    })

    ipcMain.handle('send-import', async (_, importData: FileImport | NotionSync) => {
        if ((await checkAnkiConnect()) === false) {
            return {
                status: 'error',
                message:
                    'AnkiConnect is not running. Please start Anki and ensure AnkiConnect is installed.'
            }
        }

        // Initialize folders and models
        const pathFile = path.join(app.getPath('userData'))
        const audioDir = path.join(pathFile, 'audio')
        void (await init(audioDir))

        let words: string[] | null = []
        switch (importData.type) {
            case 'FILE_IMPORT':
                words = await readFileContent(importData.payload.filePath)
                break

            case 'NOTION_SYNC':
                break
            default:
                console.error('Unknown import data type')
        }

        if (words === null) {
            return {
                status: 'error',
                message: 'Failed to read words from the file.'
            }
        }

        let isAudio: boolean = false
        if (importData.payload.azureKey) {
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
            const newNotes: QuizNote[] = await createFlashcards(
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
