import { createCommands } from './commands'
import { createRendererSnapshot } from './snapshot'
import type { RuntimeSettings, StateSnapshot, StateStore } from './model'

export type { RuntimeSettings, StateSnapshot, StateStore } from './model'

export const createStateStore = (initialSettings: RuntimeSettings = {}): StateStore => {
    const settings = { ...initialSettings }
    const commands = createCommands(settings)

    return {
        ...commands,
        getRendererSnapshot: (): StateSnapshot => createRendererSnapshot(settings)
    }
}
