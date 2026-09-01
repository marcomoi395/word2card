import type { SecretKey } from '../../shared/ipc'
import type { RuntimeSettings } from './model'

export interface StatePersistence {
    load: () => RuntimeSettings
    save: (settings: RuntimeSettings) => boolean
    delete: (key: SecretKey) => boolean
}
