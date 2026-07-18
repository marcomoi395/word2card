import { dialog, ipcMain } from 'electron'
import type { AppResponse, OpenFileDialogData } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { success, failure } from '../../utils/response'

export function registerFileHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.openFileDialog, async (): Promise<AppResponse<OpenFileDialogData>> => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: 'Text Files', extensions: ['txt'] }]
            })

            if (result.canceled || result.filePaths.length === 0) {
                return success({ filePath: null })
            }

            return success({ filePath: result.filePaths[0] })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to open file dialog'
            return failure(message)
        }
    })
}
