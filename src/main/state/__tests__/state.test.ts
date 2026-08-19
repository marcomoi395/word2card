import { describe, expect, it } from 'vitest'
import { createStateStore } from '../index'

describe('state package', () => {
    it('starts empty and exposes only configuration status', () => {
        const state = createStateStore()

        expect(state.getRuntimeSettings()).toEqual({})
        expect(state.getRendererSnapshot()).toEqual({
            configured: {
                openaiApiKey: false,
                azureApiKey: false,
                pexelsToken: false,
                notionToken: false,
                notionDatabaseId: false
            }
        })
    })

    it('updates runtime settings and reports missing required values', () => {
        const state = createStateStore()

        state.updateRuntimeSettings({ openaiApiKey: 'openai-key' })

        expect(state.getRuntimeSettings()).toEqual({ openaiApiKey: 'openai-key' })
        expect(state.getMissingRuntimeSettings(['openaiApiKey', 'azureApiKey'])).toEqual([
            'azureApiKey'
        ])
    })

    it('clears a runtime setting', () => {
        const state = createStateStore({ openaiApiKey: 'openai-key' })

        state.clearRuntimeSetting('openaiApiKey')

        expect(state.getRuntimeSettings()).toEqual({})
    })

    it('never returns runtime values in the renderer snapshot', () => {
        const state = createStateStore({
            openaiApiKey: 'openai-key',
            notionDatabaseId: 'database-id'
        })

        const snapshot = state.getRendererSnapshot()

        expect(snapshot).toEqual({
            configured: {
                openaiApiKey: true,
                azureApiKey: false,
                pexelsToken: false,
                notionToken: false,
                notionDatabaseId: true
            }
        })
        expect(JSON.stringify(snapshot)).not.toContain('openai-key')
        expect(JSON.stringify(snapshot)).not.toContain('database-id')
    })
})

describe('persistent state store', () => {
    it('loads settings through a typed persistence adapter', () => {
        const persistence = {
            load: () => ({ openaiApiKey: 'loaded-key' }),
            save: () => true,
            delete: () => true
        }

        const state = createStateStore({}, persistence)

        expect(state.getRuntimeSettings()).toEqual({ openaiApiKey: 'loaded-key' })
    })

    it('does not publish a runtime update when persistence fails', () => {
        const persistence = {
            load: () => ({}),
            save: () => false,
            delete: () => true
        }
        const state = createStateStore({ openaiApiKey: 'existing-key' }, persistence)

        expect(state.updateRuntimeSettings({ azureApiKey: 'azure-key' })).toBe(false)
        expect(state.getRuntimeSettings()).toEqual({ openaiApiKey: 'existing-key' })
    })

    it('only clears runtime state after persistence succeeds', () => {
        const persistence = {
            load: () => ({ openaiApiKey: 'openai-key' }),
            save: () => true,
            delete: () => false
        }
        const state = createStateStore({}, persistence)

        expect(state.clearRuntimeSetting('openaiApiKey')).toBe(false)
        expect(state.getRuntimeSettings()).toEqual({ openaiApiKey: 'openai-key' })
    })
})

describe('runtime state bootstrap', () => {
    it('initializes the authoritative store from persistence', async () => {
        const { getRuntimeState, initializeRuntimeState } = await import('../runtime')
        const persistence = {
            load: () => ({ openaiApiKey: 'loaded-key' }),
            save: () => true,
            delete: () => true
        }

        initializeRuntimeState(persistence)

        expect(getRuntimeState().getRuntimeSettings()).toEqual({ openaiApiKey: 'loaded-key' })
    })
})
