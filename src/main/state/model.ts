import type { SecretKey } from '../../shared/ipc'

export interface RuntimeSettings extends Partial<Record<SecretKey, string>> {
    openaiBaseUrl?: string
    openaiModel?: string
}

export interface StateSnapshot {
    configured: Record<SecretKey, boolean>
    openaiBaseUrl?: string
    openaiModel?: string
}

export interface StateStore {
    getRuntimeSettings(): RuntimeSettings
    updateRuntimeSettings(patch: RuntimeSettings): boolean
    clearRuntimeSetting(key: SecretKey): boolean
    getMissingRuntimeSettings(requiredKeys: SecretKey[]): SecretKey[]
    getRendererSnapshot(): StateSnapshot
}
