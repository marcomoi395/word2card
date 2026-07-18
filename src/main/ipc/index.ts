import type { BrowserWindow } from 'electron'
import { registerWindowHandlers } from './handlers/window.handler'
import { registerFileHandlers } from './handlers/file.handler'
import { registerSettingsHandlers } from './handlers/settings.handler'
import { registerImportHandlers } from './handlers/import.handler'

export function registerAllIpcHandlers(mainWindow: BrowserWindow): void {
    registerWindowHandlers(mainWindow)
    registerFileHandlers()
    registerSettingsHandlers()
    registerImportHandlers()
}
