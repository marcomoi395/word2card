import type { SecretKey } from '../../shared/ipc'
import type { StatePersistence } from './persistence'
import type { RuntimeSettings, StateStore } from './model'
import { createLogger } from '../../shared/logger'

const logger = createLogger('main.state')
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
                    logger.error('runtime_settings_save_failed', {
                        error: new Error('persistence_rejected')
                    })
                    return false
                }
            } catch (error) {
                logger.error('runtime_settings_save_failed', {
                    error: error instanceof Error ? error : new Error(String(error))
                })
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
                    logger.error('runtime_setting_delete_failed', {
                        key,
                        error: new Error('persistence_rejected')
                    })
                    return false
                }
            } catch (error) {
                logger.error('runtime_setting_delete_failed', {
                    key,
                    error: error instanceof Error ? error : new Error(String(error))
                })
                return false
            }
        }

        delete settings[key]
        return true
    },
    getMissingRuntimeSettings: (requiredKeys: SecretKey[]) =>
        requiredKeys.filter((key) => !settings[key])
})
