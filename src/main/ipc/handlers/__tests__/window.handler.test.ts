import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BrowserWindow, ipcMain } from 'electron'
import { registerWindowHandlers, resetWindowHandlerRegistration } from '../window.handler'
import { IPC_CHANNELS } from '../../../../shared/ipc'

vi.mock('electron', () => ({
    app: { getVersion: vi.fn(() => '2.5.0') },
    BrowserWindow: {
        fromWebContents: vi.fn()
    },
    ipcMain: {
        on: vi.fn(),
        handle: vi.fn()
    }
}))

describe('registerWindowHandlers', () => {
    let handlers: Record<string, (event: unknown) => void>

    beforeEach(() => {
        vi.clearAllMocks()
        resetWindowHandlerRegistration()
        handlers = {}
        vi.spyOn(ipcMain, 'on').mockImplementation((channel, handler) => {
            handlers[channel] = handler as (event: unknown) => void
            return ipcMain
        })
    })

    it('registers window controls once', () => {
        registerWindowHandlers()
        registerWindowHandlers()

        expect(ipcMain.on).toHaveBeenCalledTimes(2)
        expect(ipcMain.handle).toHaveBeenCalledTimes(1)
    })

    it('targets the sender window at event time', () => {
        const senderWindow = { minimize: vi.fn(), close: vi.fn() }
        vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(senderWindow as never)
        registerWindowHandlers()

        handlers[IPC_CHANNELS.windowMinimize]({ sender: {} })
        handlers[IPC_CHANNELS.windowClose]({ sender: {} })

        expect(senderWindow.minimize).toHaveBeenCalled()
        expect(senderWindow.close).toHaveBeenCalled()
    })

    it('ignores stale or invalid sender events', () => {
        vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null)
        registerWindowHandlers()

        expect(() => handlers[IPC_CHANNELS.windowMinimize]({ sender: {} })).not.toThrow()
        expect(() => handlers[IPC_CHANNELS.windowClose]({ sender: {} })).not.toThrow()
    })

    it('ignores sender lookup exceptions', () => {
        vi.mocked(BrowserWindow.fromWebContents).mockImplementation(() => {
            throw new Error('stale sender')
        })
        registerWindowHandlers()

        expect(() => handlers[IPC_CHANNELS.windowMinimize]({ sender: {} })).not.toThrow()
        expect(() => handlers[IPC_CHANNELS.windowClose]({ sender: {} })).not.toThrow()
    })
})
