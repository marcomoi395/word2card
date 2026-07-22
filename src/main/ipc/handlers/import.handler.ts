import { ipcMain } from 'electron'
import type { AppResponse } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { failure } from '../../utils/response'
import { parseImportRequest } from '../../utils/validators'
import { ImportService } from '../../services/import.service'

export function registerImportHandlers(): void {
    ipcMain.handle(
        IPC_CHANNELS.sendImport,
        async (_event, payload: unknown): Promise<AppResponse> => {
            const importRequest = parseImportRequest(payload)
            if (!importRequest) {
                return failure('Invalid import request payload')
            }

            return ImportService.handleImportRequest(importRequest)
        }
    )
}
