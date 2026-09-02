import type { BrowserWindow } from 'electron'
import { registerWindowHandlers } from './handlers/window.handler'
import { registerFileHandlers } from './handlers/file.handler'
import { registerSettingsHandlers } from './handlers/settings.handler'
import { registerImportHandlers } from './handlers/import.handler'
import { registerProviderHealthHandlers } from './handlers/provider-health.handler'
let registered = false

export function registerAllIpcHandlers(_mainWindow: BrowserWindow): void {
    if (registered) {
        return
    }

    registered = true
    registerWindowHandlers()
    registerFileHandlers()
    registerSettingsHandlers()
    registerProviderHealthHandlers()
    registerImportHandlers()
}
