import { ipcMain } from 'electron'
import type { AppResponse, VocabularyRecord } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { CollectionService } from '../../services/collection.service'
import type { DatabaseRepositories } from '../../database'
import { failure, success } from '../../utils/response'
import { parseEditVocabularyPayload } from '../../utils/validators'
import { createLogger } from '../../../shared/logger'

const logger = createLogger('main.ipc.collection')
export function registerCollectionHandlers(database: DatabaseRepositories): void {
    const service = new CollectionService(database)
    ipcMain.handle(
        IPC_CHANNELS.listVocabulary,
        async (): Promise<AppResponse<VocabularyRecord[]>> => {
            try {
                return success(service.list())
            } catch (error) {
                logger.error('collection_list_failed', {
                    error: error instanceof Error ? error : new Error(String(error))
                })
                return failure(error instanceof Error ? error.message : 'Failed to load collection')
            }
        }
    )
    ipcMain.handle(
        IPC_CHANNELS.updateVocabulary,
        async (_event, payload: unknown): Promise<AppResponse<VocabularyRecord>> => {
            const parsed = parseEditVocabularyPayload(payload)
            if (!parsed) {
                logger.error('vocabulary_update_validation_failed', {
                    error: new Error('Invalid vocabulary edit payload')
                })
                return failure('Invalid vocabulary edit payload')
            }
            try {
                return success(service.update(parsed.id, parsed.changes))
            } catch (error) {
                logger.error('vocabulary_update_failed', {
                    error: error instanceof Error ? error : new Error(String(error))
                })
                return failure(
                    error instanceof Error ? error.message : 'Failed to update vocabulary'
                )
            }
        }
    )
}
