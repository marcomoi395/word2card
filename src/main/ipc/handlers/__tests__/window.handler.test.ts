import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'
import { registerWindowHandlers } from '../window.handler'
import { IPC_CHANNELS } from '../../../../shared/ipc'

describe('registerWindowHandlers', () => {
  let mockWindow: any
  let handlers: Record<string, (...args: any[]) => void>

  beforeEach(() => {
    vi.clearAllMocks()
    handlers = {}

    // Mock BrowserWindow
    mockWindow = {
      minimize: vi.fn(),
      close: vi.fn(),
    }

    // Capture handlers registered via ipcMain.on
    vi.spyOn(ipcMain, 'on').mockImplementation((channel, handler) => {
      handlers[channel] = handler
      return ipcMain
    })
  })

  it('registers windowMinimize handler', () => {
    registerWindowHandlers(mockWindow)
    expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.windowMinimize, expect.any(Function))
  })

  it('registers windowClose handler', () => {
    registerWindowHandlers(mockWindow)
    expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.windowClose, expect.any(Function))
  })

  it('windowMinimize handler calls mainWindow.minimize()', () => {
    registerWindowHandlers(mockWindow)
    handlers[IPC_CHANNELS.windowMinimize]()
    expect(mockWindow.minimize).toHaveBeenCalled()
  })

  it('windowClose handler calls mainWindow.close()', () => {
    registerWindowHandlers(mockWindow)
    handlers[IPC_CHANNELS.windowClose]()
    expect(mockWindow.close).toHaveBeenCalled()
  })
})
