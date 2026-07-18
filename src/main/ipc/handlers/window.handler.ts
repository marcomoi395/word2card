import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc'

export function registerWindowHandlers(mainWindow: BrowserWindow): void {
    ipcMain.on(IPC_CHANNELS.windowMinimize, () => {
        mainWindow.minimize()
    })

    ipcMain.on(IPC_CHANNELS.windowClose, () => {
        mainWindow.close()
    })
}
