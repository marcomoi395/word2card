import path from 'node:path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import { createWindow } from './window'
import { registerAllIpcHandlers } from './ipc'
import SecretManager, { createSecretPersistence } from './store'
import { initializeRuntimeState } from './state/runtime'
import { createDatabaseSettingsPersistence, openDatabase } from './database'
import type { RuntimeSettings } from './state/model'

app.whenReady().then(() => {
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

    app.on('before-quit', () => database.close())
    const mainWindow = createWindow()
    registerAllIpcHandlers(mainWindow, database)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
