import { ipcMain } from 'electron'
import type { AppResponse, VocabularyRecord, DeleteVocabularySummary } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { CollectionService } from '../../services/collection.service'
import type { DatabaseRepositories } from '../../database'
import { failure, success } from '../../utils/response'
import { parseCreateVocabularyPayload, parseDeleteVocabularyPayload, parseEditVocabularyPayload } from '../../utils/validators'
import { createLogger } from '../../../shared/logger'

const logger = createLogger('main.ipc.collection')
export function registerCollectionHandlers(database: DatabaseRepositories): void {
    const service = new CollectionService(database)
    ipcMain.handle(IPC_CHANNELS.listVocabulary, async (): Promise<AppResponse<VocabularyRecord[]>> => {
        try { return success(service.list()) } catch (error) { logger.error('collection_list_failed', { error }); return failure(error instanceof Error ? error.message : 'Failed to load collection') }
    })
    ipcMain.handle(IPC_CHANNELS.createVocabulary, async (_event, payload: unknown): Promise<AppResponse<VocabularyRecord>> => {
        const parsed = parseCreateVocabularyPayload(payload)
        if (!parsed) return failure('Invalid vocabulary create payload')
        try { return success(service.create(parsed.word)) } catch (error) { return failure(error instanceof Error ? error.message : 'Failed to create vocabulary') }
    })
    ipcMain.handle(IPC_CHANNELS.updateVocabulary, async (_event, payload: unknown): Promise<AppResponse<VocabularyRecord>> => {
        const parsed = parseEditVocabularyPayload(payload)
        if (!parsed) return failure('Invalid vocabulary edit payload')
        try { return success(service.update(parsed.id, parsed.changes)) } catch (error) { return failure(error instanceof Error ? error.message : 'Failed to update vocabulary') }
    })
    ipcMain.handle(IPC_CHANNELS.deleteVocabulary, async (_event, payload: unknown): Promise<AppResponse<DeleteVocabularySummary>> => {
        const parsed = parseDeleteVocabularyPayload(payload)
        if (!parsed) return failure('Invalid vocabulary delete payload')
        try { return success({ deleted: service.delete(parsed.recordIds) }) } catch (error) { return failure(error instanceof Error ? error.message : 'Failed to delete vocabulary') }
    })
}
