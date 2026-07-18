import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import { createWindow } from './window'
import { registerAllIpcHandlers } from './ipc'
import SecretManager from './store'
import State, { type TokenMap } from './state'

const loadTokensToState = (): void => {
    const tokens: TokenMap = {
        openaiApiKey: SecretManager.getSecret('openaiApiKey') ?? undefined,
        azureApiKey: SecretManager.getSecret('azureApiKey') ?? undefined,
        pexelsToken: SecretManager.getSecret('pexelsToken') ?? undefined,
        notionToken: SecretManager.getSecret('notionToken') ?? undefined,
        notionDatabaseId: SecretManager.getSecret('notionDatabaseId') ?? undefined
    }
    State.setAllTokens(tokens)
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.youngmarco.word2card')
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    loadTokensToState()

    const mainWindow = createWindow()
    registerAllIpcHandlers(mainWindow)

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            const newWindow = createWindow()
            registerAllIpcHandlers(newWindow)
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
