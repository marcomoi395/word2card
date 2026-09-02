import { ipcMain } from 'electron'
import type { AnkiSubmissionSummary, AppResponse } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { failure } from '../../utils/response'
import { parseRecordIdsPayload } from '../../utils/validators'
import { AnkiService } from '../../services/anki.service'
import type { DatabaseRepositories } from '../../database'

export function registerAnkiHandlers(database: DatabaseRepositories): void {
    ipcMain.handle(
        IPC_CHANNELS.submitToAnki,
        async (_event, payload: unknown): Promise<AppResponse<AnkiSubmissionSummary>> => {
            const parsed = parseRecordIdsPayload(payload)
            if (!parsed) return failure('Invalid Anki submission payload')
            try {
                return await AnkiService.submitPersistedCards(database, parsed.recordIds)
            } catch (error) {
                return failure(
                    error instanceof Error ? error.message : 'Failed to submit cards to Anki'
                )
            }
        }
    )
}
