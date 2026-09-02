import { ipcMain } from 'electron'
import type { AppResponse, ProviderHealthSnapshot } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { checkProviderHealth } from '../../provider-health'
import { failure, success } from '../../utils/response'

export function registerProviderHealthHandlers(): void {
    ipcMain.handle(
        IPC_CHANNELS.getProviderHealth,
        async (): Promise<AppResponse<ProviderHealthSnapshot>> => {
            try {
                return success(await checkProviderHealth())
            } catch (error) {
                return failure(
                    error instanceof Error ? error.message : 'Failed to check provider health'
                )
            }
        }
    )
}
