import { ipcMain } from 'electron'
import type { AppResponse, GenerateMissingDataPayload, GenerationSummary } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { GenerationService } from '../../services/generation.service'
import type { DatabaseRepositories } from '../../database'
import { failure, success } from '../../utils/response'

function parsePayload(value: unknown): GenerateMissingDataPayload | null {
    if (value === undefined) return {}
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    const recordIds = (value as { recordIds?: unknown }).recordIds
    if (recordIds === undefined) return {}
    if (!Array.isArray(recordIds) || recordIds.some((id) => typeof id !== 'string' || !id.trim())) return null
    return { recordIds }
}

export function registerGenerationHandlers(database: DatabaseRepositories): void {
    ipcMain.handle(
        IPC_CHANNELS.generateMissingData,
        async (_event, payload: unknown): Promise<AppResponse<GenerationSummary>> => {
            const parsed = parsePayload(payload)
            if (!parsed) return failure('Invalid generation request payload')
            try {
                return success(await GenerationService.generateMissingData(database, parsed.recordIds))
            } catch (error) {
                return failure(error instanceof Error ? error.message : 'Failed to generate card data')
            }
        }
    )
}
