import { createCommands } from './commands'
import { createRendererSnapshot } from './snapshot'
import type { StatePersistence } from './persistence'
import type { RuntimeSettings, StateSnapshot, StateStore } from './model'

export type { RuntimeSettings, StateSnapshot, StateStore } from './model'
export type { StatePersistence } from './persistence'

export const createStateStore = (
    initialSettings: RuntimeSettings = {},
    persistence?: StatePersistence
): StateStore => {
    const settings = {
        ...initialSettings,
        ...(persistence?.load() ?? {})
    }
    const commands = createCommands(settings, persistence)

    return {
        ...commands,
        getRendererSnapshot: (): StateSnapshot => createRendererSnapshot(settings)
    }
}
