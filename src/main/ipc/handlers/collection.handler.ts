import { ipcMain } from 'electron'
import type { AppResponse, VocabularyRecord } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { CollectionService } from '../../services/collection.service'
import type { DatabaseRepositories } from '../../database'
import { failure, success } from '../../utils/response'
import { parseEditVocabularyPayload } from '../../utils/validators'

export function registerCollectionHandlers(database: DatabaseRepositories): void {
    const service = new CollectionService(database)
    ipcMain.handle(
        IPC_CHANNELS.listVocabulary,
        async (): Promise<AppResponse<VocabularyRecord[]>> => {
            try {
                return success(service.list())
            } catch (error) {
                return failure(error instanceof Error ? error.message : 'Failed to load collection')
            }
        }
    )
    ipcMain.handle(
        IPC_CHANNELS.updateVocabulary,
        async (_event, payload: unknown): Promise<AppResponse<VocabularyRecord>> => {
            const parsed = parseEditVocabularyPayload(payload)
            if (!parsed) return failure('Invalid vocabulary edit payload')
            try {
                return success(service.update(parsed.id, parsed.changes))
            } catch (error) {
                return failure(
                    error instanceof Error ? error.message : 'Failed to update vocabulary'
                )
            }
        }
    )
}
