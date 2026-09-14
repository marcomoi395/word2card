import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'
import { registerSettingsHandlers } from '../settings.handler'
import { IPC_CHANNELS } from '../../../../shared/ipc'

vi.mock('../../../utils/validators', () => ({
    parseSaveSettingsPayload: vi.fn()
}))

vi.mock('../../../state/runtime', () => {
    const updateRuntimeSettings = vi.fn(() => true)
    const getRendererSnapshot = vi.fn(() => ({
        configured: {
            openaiApiKey: true,
            pexelsToken: true,
            notionToken: true,
            notionDatabaseId: true
        }
    }))
    const state = { getRendererSnapshot, updateRuntimeSettings }
    return { getRuntimeState: vi.fn(() => state) }
})

import { parseSaveSettingsPayload } from '../../../utils/validators'
import { getRuntimeState } from '../../../state/runtime'

describe('registerSettingsHandlers', () => {
    let handlers: Record<string, (...args: unknown[]) => Promise<unknown>>

    beforeEach(() => {
        vi.clearAllMocks()
        handlers = {}
        vi.spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => {
            handlers[channel] = handler as (...args: unknown[]) => Promise<unknown>
        })
    })

    it('registers save and settings-status handlers', () => {
        registerSettingsHandlers()

        expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.saveSettings, expect.any(Function))
        expect(ipcMain.handle).toHaveBeenCalledWith(
            IPC_CHANNELS.getSettingsStatus,
            expect.any(Function)
        )
    })

    it('saves trimmed settings atomically', async () => {
        vi.mocked(parseSaveSettingsPayload).mockReturnValue({
            openaiApiKey: '  openai-key  ',
            pexelsToken: 'pexels-token'
        })
        registerSettingsHandlers()

        const result = await handlers[IPC_CHANNELS.saveSettings](null, {})

        expect(getRuntimeState().updateRuntimeSettings).toHaveBeenCalledWith({
            openaiApiKey: 'openai-key',
            pexelsToken: 'pexels-token'
        })
        expect(result).toEqual({ status: 'success', message: 'Settings saved successfully' })
    })

    it('returns failure without publishing state when atomic save fails', async () => {
        vi.mocked(parseSaveSettingsPayload).mockReturnValue({
            openaiApiKey: 'openai-key',
            pexelsToken: 'pexels-token'
        })
        vi.mocked(getRuntimeState().updateRuntimeSettings).mockReturnValue(false)
        registerSettingsHandlers()

        const result = await handlers[IPC_CHANNELS.saveSettings](null, {})

        expect(result).toEqual({ status: 'error', message: 'Failed to save some settings' })
    })

    it('returns only redacted configuration status', async () => {
        registerSettingsHandlers()

        const result = await handlers[IPC_CHANNELS.getSettingsStatus]()

        expect(result).toEqual({
            status: 'success',
            data: {
                configured: {
                    openaiApiKey: true,
                    pexelsToken: true,
                    notionToken: true,
                    notionDatabaseId: true
                }
            }
        })
        expect(JSON.stringify(result)).not.toContain('key')
        expect(JSON.stringify(result)).not.toContain('token')
    })

    it('returns validation failure for invalid settings', async () => {
        vi.mocked(parseSaveSettingsPayload).mockReturnValue(null)
        registerSettingsHandlers()

        const result = await handlers[IPC_CHANNELS.saveSettings](null, {})

        expect(result).toEqual({ status: 'error', message: 'Invalid settings payload' })
    })

    it('returns a safe error when status projection throws', async () => {
        vi.mocked(getRuntimeState().getRendererSnapshot).mockImplementation(() => {
            throw new Error('state projection failed')
        })
        registerSettingsHandlers()

        const result = await handlers[IPC_CHANNELS.getSettingsStatus]()

        expect(result).toEqual({ status: 'error', message: 'state projection failed' })
    })

    it('returns generic error for non-Error status failures', async () => {
        vi.mocked(getRuntimeState().getRendererSnapshot).mockImplementation(() => {
            throw 'status failed'
        })
        registerSettingsHandlers()

        const result = await handlers[IPC_CHANNELS.getSettingsStatus]()

        expect(result).toEqual({
            status: 'error',
            message: 'Failed to retrieve settings status'
        })
    })
})
