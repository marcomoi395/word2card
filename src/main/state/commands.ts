import type { SecretKey } from '../../shared/ipc'
import type { StatePersistence } from './persistence'
import type { RuntimeSettings, StateStore } from './model'

export const createCommands = (
    settings: RuntimeSettings,
    persistence?: StatePersistence
): Pick<
    StateStore,
    | 'getRuntimeSettings'
    | 'updateRuntimeSettings'
    | 'clearRuntimeSetting'
    | 'getMissingRuntimeSettings'
> => ({
    getRuntimeSettings: () => ({ ...settings }),
    updateRuntimeSettings: (patch: RuntimeSettings) => {
        const nextSettings = { ...settings, ...patch }

        if (persistence) {
            try {
                if (!persistence.save(nextSettings)) {
                    return false
                }
            } catch {
                return false
            }
        }

        Object.keys(settings).forEach((key) => delete settings[key as SecretKey])
        Object.assign(settings, nextSettings)
        return true
    },
    clearRuntimeSetting: (key: SecretKey) => {
        if (persistence) {
            try {
                if (!persistence.delete(key)) {
                    return false
                }
            } catch {
                return false
            }
        }

        delete settings[key]
        return true
    },
    getMissingRuntimeSettings: (requiredKeys: SecretKey[]) =>
        requiredKeys.filter((key) => !settings[key])
})
