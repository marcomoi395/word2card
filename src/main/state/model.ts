import type { SecretKey } from '../../shared/ipc'

export type RuntimeSettings = Partial<Record<SecretKey, string>>

export interface StateSnapshot {
    configured: Record<SecretKey, boolean>
}

export interface StateStore {
    getRuntimeSettings(): RuntimeSettings
    updateRuntimeSettings(patch: RuntimeSettings): void
    clearRuntimeSetting(key: SecretKey): void
    getMissingRuntimeSettings(requiredKeys: SecretKey[]): SecretKey[]
    getRendererSnapshot(): StateSnapshot
}
