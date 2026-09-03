import { ipcMain } from 'electron'
import type { AppResponse, ProviderHealthSnapshot } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { checkProviderHealth } from '../../provider-health'
import { failure, success } from '../../utils/response'
import { createLogger } from '../../../shared/logger'

const logger = createLogger('main.ipc.provider_health')

export function registerProviderHealthHandlers(): void {
    ipcMain.handle(
        IPC_CHANNELS.getProviderHealth,
        async (): Promise<AppResponse<ProviderHealthSnapshot>> => {
            try {
                return success(await checkProviderHealth())
            } catch (error) {
                logger.error('provider_health_check_failed', {
                    error: error instanceof Error ? error : new Error(String(error))
                })
                return failure(
                    error instanceof Error ? error.message : 'Failed to check provider health'
                )
            }
        }
    )
}
