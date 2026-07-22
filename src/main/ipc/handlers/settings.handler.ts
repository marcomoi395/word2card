import { ipcMain } from 'electron'
import type { AppResponse, SecretsData } from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { success, failure } from '../../utils/response'
import { parseSaveSettingsPayload } from '../../utils/validators'
import SecretManager from '../../store'
import State from '../../state'

const syncRuntimeSecret = (key: string, value: string): boolean => {
    const trimmedValue = value.trim()
    if (trimmedValue.length === 0) {
        SecretManager.deleteSecret(key as any)
        State.removeToken(key as any)
        return true
    }

    const isSaved = SecretManager.saveSecret(key as any, trimmedValue)
    if (isSaved) {
        State.setToken(key as any, trimmedValue)
    }
    return isSaved
}

const getSecretsData = (): SecretsData => ({
    openaiApiKey: State.getToken('openaiApiKey') || '',
    azureApiKey: State.getToken('azureApiKey') || '',
    pexelsToken: State.getToken('pexelsToken') || '',
    notionToken: State.getToken('notionToken') || '',
    notionDatabaseId: State.getToken('notionDatabaseId') || ''
})

export function registerSettingsHandlers(): void {
    ipcMain.handle(
        IPC_CHANNELS.saveSettings,
        async (_event, payload: unknown): Promise<AppResponse> => {
            const parsed = parseSaveSettingsPayload(payload)
            if (!parsed) {
                return failure('Invalid settings payload')
            }

            const results = [
                syncRuntimeSecret('openaiApiKey', parsed.openaiApiKey),
                syncRuntimeSecret('azureApiKey', parsed.azureApiKey),
                syncRuntimeSecret('pexelsToken', parsed.pexelsToken)
            ]

            if (results.every((result) => result)) {
                return success(undefined, 'Settings saved successfully')
            }

            return failure('Failed to save some settings')
        }
    )

    ipcMain.handle(IPC_CHANNELS.getSecret, async (): Promise<AppResponse<SecretsData>> => {
        try {
            return success(getSecretsData())
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to retrieve secrets'
            return failure(message)
        }
    })
}
