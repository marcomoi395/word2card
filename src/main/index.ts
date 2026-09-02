import path from 'node:path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import { createWindow } from './window'
import { registerAllIpcHandlers } from './ipc'
import SecretManager, { createSecretPersistence } from './store'
import { initializeRuntimeState } from './state/runtime'
import { openDatabase } from './database'
app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.youngmarco.word2card')
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    const database = openDatabase(path.join(app.getPath('userData'), 'word2card.db'))
    initializeRuntimeState(createSecretPersistence(SecretManager))
    app.on('before-quit', () => database.close())

    const mainWindow = createWindow()
    registerAllIpcHandlers(mainWindow)

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
