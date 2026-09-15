import { join } from 'path'
import { BrowserWindow, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createLogger } from '../shared/logger'

const logger = createLogger('main.window')

export const isAllowedExternalUrl = (rawUrl: string): boolean => {
    try {
        const allowed = new URL(rawUrl).protocol === 'https:'
        logger.debug(allowed ? 'external_url_allowed' : 'external_url_blocked', {
            protocol: new URL(rawUrl).protocol
        })
        return allowed
    } catch {
        logger.debug('external_url_blocked', { reason: 'invalid_url' })
        return false
    }
}

export function createWindow(): BrowserWindow {
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 1200,
        minWidth: 1600,
        minHeight: 1200,
        show: false,
        resizable: false,
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
    logger.info('window_created')

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
        logger.info('window_shown')
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        if (isAllowedExternalUrl(details.url)) {
            void shell.openExternal(details.url)
        }
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        logger.debug('window_renderer_loading', { mode: 'development' })
    } else {
        void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
        logger.debug('window_renderer_loading', { mode: 'production' })
    }

    return mainWindow
}
