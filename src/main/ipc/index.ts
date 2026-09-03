import type { BrowserWindow } from 'electron'
import { createLogger } from '../../shared/logger'
import { registerWindowHandlers } from './handlers/window.handler'
import { registerFileHandlers } from './handlers/file.handler'
import { registerSettingsHandlers } from './handlers/settings.handler'
import { registerImportHandlers } from './handlers/import.handler'
import { registerProviderHealthHandlers } from './handlers/provider-health.handler'
import { registerCollectionHandlers } from './handlers/collection.handler'
import { registerGenerationHandlers } from './handlers/generation.handler'
import { registerAnkiHandlers } from './handlers/anki.handler'
import type { DatabaseRepositories } from '../database'

const logger = createLogger('main.ipc')

export function registerAllIpcHandlers(
    _mainWindow: BrowserWindow,
    database: DatabaseRepositories
): void {
    registerWindowHandlers()
    registerFileHandlers()
    registerSettingsHandlers()
    registerProviderHealthHandlers()
    registerImportHandlers(database)
    registerCollectionHandlers(database)
    registerGenerationHandlers(database)
    registerAnkiHandlers(database)
    logger.info('ipc_handlers_registered')
}
