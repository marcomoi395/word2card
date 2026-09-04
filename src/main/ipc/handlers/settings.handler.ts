import { ipcMain } from 'electron'
import type { AppResponse, SettingsStatus } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { success, failure } from '../../utils/response'
import { parseSaveSettingsPayload } from '../../utils/validators'
import { getRuntimeState } from '../../state/runtime'
import { createLogger } from '../../../shared/logger'

const logger = createLogger('main.ipc.settings')
export function registerSettingsHandlers(): void {
    ipcMain.handle(
        IPC_CHANNELS.saveSettings,
        async (_event, payload: unknown): Promise<AppResponse> => {
            const parsed = parseSaveSettingsPayload(payload)
            if (!parsed) {
                logger.error('settings_validation_failed', {
                    error: new Error('Invalid settings payload')
                })
                return failure('Invalid settings payload')
            }

            const patch = {
                openaiApiKey: parsed.openaiApiKey.trim(),
                azureApiKey: parsed.azureApiKey.trim(),
                pexelsToken: parsed.pexelsToken.trim(),
                ...(parsed.notionToken === undefined
                    ? {}
                    : { notionToken: parsed.notionToken.trim() }),
                ...(parsed.notionDatabaseId === undefined
                    ? {}
                    : { notionDatabaseId: parsed.notionDatabaseId.trim() }),
                ...(parsed.openaiBaseUrl === undefined
                    ? {}
                    : { openaiBaseUrl: parsed.openaiBaseUrl.trim() }),
                ...(parsed.openaiModel === undefined
                    ? {}
                    : { openaiModel: parsed.openaiModel.trim() })
            }

            if (getRuntimeState().updateRuntimeSettings(patch)) {
                return success(undefined, 'Settings saved successfully')
            }
            logger.error('settings_update_failed', {
                error: new Error('Failed to save some settings')
            })
            return failure('Failed to save some settings')
        }
    )

    ipcMain.handle(
        IPC_CHANNELS.getSettingsStatus,
        async (): Promise<AppResponse<SettingsStatus>> => {
            try {
                return success(getRuntimeState().getRendererSnapshot())
            } catch (error) {
                logger.error('settings_status_failed', {
                    error: error instanceof Error ? error : new Error(String(error))
                })
                const message =
                    error instanceof Error ? error.message : 'Failed to retrieve settings status'
                return failure(message)
            }
        }
    )
}
