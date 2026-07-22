import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dialog, ipcMain } from 'electron'
import { registerFileHandlers } from '../file.handler'
import { IPC_CHANNELS } from '../../../../shared/ipc'

describe('registerFileHandlers', () => {
    let handlers: Record<string, (...args: any[]) => Promise<any>>

    beforeEach(() => {
        vi.clearAllMocks()
        handlers = {}

        // Capture handlers registered via ipcMain.handle
        vi.spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => {
            handlers[channel] = handler as (...args: any[]) => Promise<any>
        })
    })

    it('registers openFileDialog handler', () => {
        registerFileHandlers()
        expect(ipcMain.handle).toHaveBeenCalledWith(
            IPC_CHANNELS.openFileDialog,
            expect.any(Function)
        )
    })

    it('returns success with filePath when file is selected', async () => {
        registerFileHandlers()

        vi.spyOn(dialog, 'showOpenDialog').mockResolvedValue({
            canceled: false,
            filePaths: ['/path/to/file.txt']
        } as any)

        const result = await handlers[IPC_CHANNELS.openFileDialog]()

        expect(result).toEqual({
            status: 'success',
            data: { filePath: '/path/to/file.txt' }
        })
    })

    it('returns success with null when dialog is canceled', async () => {
        registerFileHandlers()

        vi.spyOn(dialog, 'showOpenDialog').mockResolvedValue({
            canceled: true,
            filePaths: []
        } as any)

        const result = await handlers[IPC_CHANNELS.openFileDialog]()

        expect(result).toEqual({
            status: 'success',
            data: { filePath: null }
        })
    })

    it('returns success with null when filePaths is empty', async () => {
        registerFileHandlers()

        vi.spyOn(dialog, 'showOpenDialog').mockResolvedValue({
            canceled: false,
            filePaths: []
        } as any)

        const result = await handlers[IPC_CHANNELS.openFileDialog]()

        expect(result).toEqual({
            status: 'success',
            data: { filePath: null }
        })
    })

    it('returns failure when dialog throws Error', async () => {
        registerFileHandlers()

        vi.spyOn(dialog, 'showOpenDialog').mockRejectedValue(new Error('permission denied'))

        const result = await handlers[IPC_CHANNELS.openFileDialog]()

        expect(result).toEqual({
            status: 'error',
            message: 'permission denied'
        })
    })

    it('returns failure with default message when dialog throws non-Error', async () => {
        registerFileHandlers()

        vi.spyOn(dialog, 'showOpenDialog').mockRejectedValue('some string error')

        const result = await handlers[IPC_CHANNELS.openFileDialog]()

        expect(result).toEqual({
            status: 'error',
            message: 'Failed to open file dialog'
        })
    })
})
