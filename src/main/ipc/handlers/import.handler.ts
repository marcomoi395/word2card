import { ipcMain } from 'electron'
import type { AppResponse, ImportSummary } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { failure } from '../../utils/response'
import { parseImportRequest } from '../../utils/validators'
import { ImportService, setImportDatabase } from '../../services/import.service'
import { validateTextFilePath } from '../../helper/readFile'
import type { DatabaseRepositories } from '../../database'

export function registerImportHandlers(database?: DatabaseRepositories): void {
    if (database) setImportDatabase(database)
    ipcMain.handle(
        IPC_CHANNELS.sendImport,
        async (_event, payload: unknown): Promise<AppResponse<ImportSummary>> => {
            const importRequest = parseImportRequest(payload)
            if (!importRequest) return failure('Invalid import request payload')
            if (
                importRequest.type === 'FILE_IMPORT' &&
                !(await validateTextFilePath(importRequest.payload.filePath))
            )
                return failure('Invalid text file path')
            return ImportService.handleImportRequest(importRequest)
        }
    )
}
