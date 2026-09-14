import type { SecretKey } from '../../shared/ipc'
import type { RuntimeSettings, StateSnapshot } from './model'

const SECRET_KEYS: SecretKey[] = ['openaiApiKey', 'pexelsToken', 'notionToken', 'notionDatabaseId']

export const createRendererSnapshot = (settings: RuntimeSettings): StateSnapshot => ({
    configured: Object.fromEntries(
        SECRET_KEYS.map((key) => [key, Boolean(settings[key])])
    ) as Record<SecretKey, boolean>,
    ...(settings.openaiBaseUrl ? { openaiBaseUrl: settings.openaiBaseUrl } : {}),
    ...(settings.openaiModel ? { openaiModel: settings.openaiModel } : {})
})
