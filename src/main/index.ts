import path from 'node:path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import { createLogger } from '../shared/logger'
import { createWindow } from './window'
import { registerAllIpcHandlers } from './ipc'
import SecretManager, { createSecretPersistence } from './store'
import { initializeRuntimeState } from './state/runtime'
import { createDatabaseSettingsPersistence, openDatabase } from './database'
import type { RuntimeSettings } from './state/model'

const logger = createLogger('main')

if (process.env.NODE_ENV === 'test' && process.env.WORD2CARD_TEST_USER_DATA) {
    app.setPath('userData', process.env.WORD2CARD_TEST_USER_DATA)
}

app.whenReady().then(() => {
    logger.info('app_ready')
    electronApp.setAppUserModelId('com.youngmarco.word2card')
    app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

    const database = openDatabase(path.join(app.getPath('userData'), 'word2card.db'))
    const secretPersistence = createSecretPersistence(SecretManager)
    const databasePersistence = createDatabaseSettingsPersistence(database)
    initializeRuntimeState({
        load: () => ({ ...secretPersistence.load(), ...databasePersistence.load() }),
        save: (settings: RuntimeSettings) =>
            secretPersistence.save(settings) && databasePersistence.save(settings),
        delete: (key) =>
            key === 'openaiApiKey' || key === 'openaiBaseUrl' || key === 'openaiModel'
                ? databasePersistence.delete(key)
                : secretPersistence.delete(key)
    })
    logger.info('runtime_state_initialized')

    app.on('before-quit', () => {
        logger.info('app_quitting')
        database.close()
    })
    const mainWindow = createWindow()
    registerAllIpcHandlers(mainWindow, database)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            logger.info('app_activated_recreating_window')
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    logger.info('all_windows_closed', { should_quit: process.platform !== 'darwin' })
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
