import type { RuntimeSettings, StateStore } from './model'
import type { SecretKey } from '../../shared/ipc'

export const createCommands = (
    settings: RuntimeSettings
): Pick<
    StateStore,
    | 'getRuntimeSettings'
    | 'updateRuntimeSettings'
    | 'clearRuntimeSetting'
    | 'getMissingRuntimeSettings'
> => ({
    getRuntimeSettings: () => ({ ...settings }),
    updateRuntimeSettings: (patch: RuntimeSettings) => {
        Object.assign(settings, patch)
    },
    clearRuntimeSetting: (key: SecretKey) => {
        delete settings[key]
    },
    getMissingRuntimeSettings: (requiredKeys: SecretKey[]) =>
        requiredKeys.filter((key) => !settings[key])
})
