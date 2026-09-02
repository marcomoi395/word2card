import { join } from 'path'
import { BrowserWindow, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

export const isAllowedExternalUrl = (rawUrl: string): boolean => {
    try {
        return new URL(rawUrl).protocol === 'https:'
    } catch {
        return false
    }
}
export function createWindow(): BrowserWindow {
    const mainWindow = new BrowserWindow({
        width: 1180,
        height: 760,
        show: false,
        resizable: true,
        movable: true,
        autoHideMenuBar: true,
        icon,
        ...(process.platform === 'linux' ? { icon } : {}),
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
        if (isAllowedExternalUrl(details.url)) {
            void shell.openExternal(details.url)
        }
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return mainWindow
}
