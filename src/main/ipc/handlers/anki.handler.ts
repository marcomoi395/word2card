import { ipcMain } from 'electron'
import type { AnkiSubmissionSummary, AppResponse } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { failure } from '../../utils/response'
import { parseRecordIdsPayload } from '../../utils/validators'
import { AnkiService } from '../../services/anki.service'
import type { DatabaseRepositories } from '../../database'
import { createLogger } from '../../../shared/logger'

const logger = createLogger('main.ipc.anki')
export function registerAnkiHandlers(database: DatabaseRepositories): void {
    ipcMain.handle(
        IPC_CHANNELS.submitToAnki,
        async (_event, payload: unknown): Promise<AppResponse<AnkiSubmissionSummary>> => {
            const parsed = parseRecordIdsPayload(payload)
            if (!parsed) {
                logger.error('anki_submission_validation_failed', {
                    error: new Error('Invalid Anki submission payload')
                })
                return failure('Invalid Anki submission payload')
            }
            try {
                return parsed.records
                    ? await AnkiService.submitDraftCards(database, parsed.records)
                    : await AnkiService.submitPersistedCards(database, parsed.recordIds)
            } catch (error) {
                logger.error('anki_submission_failed', {
                    error: error instanceof Error ? error : new Error(String(error)),
                    recordCount: parsed.recordIds?.length ?? 0
                })
                return failure(
                    error instanceof Error ? error.message : 'Failed to submit cards to Anki'
                )
            }
        }
    )
}
