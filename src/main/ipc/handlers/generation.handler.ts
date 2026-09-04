import { ipcMain } from 'electron'
import type {
    AppResponse,
    GenerateMissingDataPayload,
    GenerationSummary
} from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { GenerationService } from '../../services/generation.service'
import type { DatabaseRepositories } from '../../database'
import { failure, success } from '../../utils/response'
import { parseRecordIdsPayload } from '../../utils/validators'
import { createLogger } from '../../../shared/logger'

const logger = createLogger('main.ipc.generation')

function parsePayload(value: unknown): GenerateMissingDataPayload | null {
    return parseRecordIdsPayload(value)
}

export function registerGenerationHandlers(database: DatabaseRepositories): void {
    ipcMain.handle(
        IPC_CHANNELS.generateMissingData,
        async (_event, payload: unknown): Promise<AppResponse<GenerationSummary>> => {
            const parsed = parsePayload(payload)
            if (!parsed) {
                logger.error('generation_validation_failed', {
                    error: new Error('Invalid generation request payload')
                })
                return failure('Invalid generation request payload')
            }
            try {
                if (parsed.records) {
                    return success(await GenerationService.generateDraftData(parsed.records))
                }
                return success(
                    await GenerationService.generateMissingData(database, parsed.recordIds)
                )
            } catch (error) {
                logger.error('generation_failed', {
                    error: error instanceof Error ? error : new Error(String(error)),
                    recordCount: parsed.recordIds?.length ?? 0
                })
                return failure(
                    error instanceof Error ? error.message : 'Failed to generate card data'
                )
            }
        }
    )
}
