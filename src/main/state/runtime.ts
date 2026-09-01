import type { SecretKey } from '../../shared/ipc'
import { createStateStore, type StatePersistence, type StateStore } from './index'

let runtimeState: StateStore = createStateStore()

export const initializeRuntimeState = (persistence: StatePersistence): void => {
    runtimeState = createStateStore({}, persistence)
}

export const getRuntimeState = (): StateStore => runtimeState

export const getRuntimeSetting = (key: SecretKey): string | undefined =>
    getRuntimeState().getRuntimeSettings()[key]

export const getMissingRuntimeSettings = (requiredKeys: SecretKey[]): SecretKey[] =>
    getRuntimeState().getMissingRuntimeSettings(requiredKeys)
