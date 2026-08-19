import { ipcMain } from 'electron'
import type { AppResponse, SettingsStatus } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { success, failure } from '../../utils/response'
import { parseSaveSettingsPayload } from '../../utils/validators'
import { getRuntimeState } from '../../state/runtime'

export function registerSettingsHandlers(): void {
    ipcMain.handle(
        IPC_CHANNELS.saveSettings,
        async (_event, payload: unknown): Promise<AppResponse> => {
            const parsed = parseSaveSettingsPayload(payload)
            if (!parsed) {
                return failure('Invalid settings payload')
            }

            const patch = {
                openaiApiKey: parsed.openaiApiKey.trim(),
                azureApiKey: parsed.azureApiKey.trim(),
                pexelsToken: parsed.pexelsToken.trim()
            }

            if (getRuntimeState().updateRuntimeSettings(patch)) {
                return success(undefined, 'Settings saved successfully')
            }

            return failure('Failed to save some settings')
        }
    )

    ipcMain.handle(
        IPC_CHANNELS.getSettingsStatus,
        async (): Promise<AppResponse<SettingsStatus>> => {
            try {
                return success(getRuntimeState().getRendererSnapshot())
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to retrieve settings status'
                return failure(message)
            }
        }
    )
}
