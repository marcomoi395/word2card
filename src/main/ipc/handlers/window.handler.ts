import { app, BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { success } from '../../utils/response'

let registered = false

export const resetWindowHandlerRegistration = (): void => {
    registered = false
}

const getSenderWindow = (event: Electron.IpcMainEvent): BrowserWindow | null => {
    try {
        return BrowserWindow.fromWebContents(event.sender)
    } catch {
        return null
    }
}

export function registerWindowHandlers(): void {
    if (registered) {
        return
    }

    registered = true
    ipcMain.on(IPC_CHANNELS.windowMinimize, (event) => {
        getSenderWindow(event)?.minimize()
    })

    ipcMain.on(IPC_CHANNELS.windowClose, (event) => {
        getSenderWindow(event)?.close()
    })

    ipcMain.handle(IPC_CHANNELS.getAppVersion, () => success(app.getVersion()))
}
