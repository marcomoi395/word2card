import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'
import { registerImportHandlers } from '../import.handler'
import { IPC_CHANNELS } from '../../../../shared/ipc'

// Mock validators
vi.mock('../../../utils/validators', () => ({
  parseImportRequest: vi.fn(),
}))

// Mock ImportService
vi.mock('../../../services/import.service', () => ({
  ImportService: {
    handleImportRequest: vi.fn(),
  },
}))

import { parseImportRequest } from '../../../utils/validators'
import { ImportService } from '../../../services/import.service'

describe('registerImportHandlers', () => {
  let handlers: Record<string, (...args: any[]) => Promise<any>>

  beforeEach(() => {
    vi.clearAllMocks()
    handlers = {}

    // Capture handlers registered via ipcMain.handle
    vi.spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => {
      handlers[channel] = handler as (...args: any[]) => Promise<any>
    })
  })

  it('registers sendImport handler', () => {
    registerImportHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.sendImport, expect.any(Function))
  })

  it('handles valid FILE_IMPORT request', async () => {
    registerImportHandlers()

    const mockParsedRequest = {
      type: 'FILE_IMPORT' as const,
      filePath: '/path/to/file.txt',
    }

    const mockServiceResponse = {
      status: 'success' as const,
      data: { imported: 10 },
    }

    vi.mocked(parseImportRequest).mockReturnValue(mockParsedRequest)
    vi.mocked(ImportService.handleImportRequest).mockResolvedValue(mockServiceResponse)

    const result = await handlers[IPC_CHANNELS.sendImport](null, { type: 'FILE_IMPORT', filePath: '/path/to/file.txt' })

    expect(parseImportRequest).toHaveBeenCalledWith({ type: 'FILE_IMPORT', filePath: '/path/to/file.txt' })
    expect(ImportService.handleImportRequest).toHaveBeenCalledWith(mockParsedRequest)
    expect(result).toEqual(mockServiceResponse)
  })

  it('handles valid NOTION_SYNC request', async () => {
    registerImportHandlers()

    const mockParsedRequest = {
      type: 'NOTION_SYNC' as const,
      notionToken: 'token',
      notionDatabaseId: 'db-id',
    }

    const mockServiceResponse = {
      status: 'success' as const,
      data: { synced: 5 },
    }

    vi.mocked(parseImportRequest).mockReturnValue(mockParsedRequest)
    vi.mocked(ImportService.handleImportRequest).mockResolvedValue(mockServiceResponse)

    const result = await handlers[IPC_CHANNELS.sendImport](null, mockParsedRequest)

    expect(ImportService.handleImportRequest).toHaveBeenCalledWith(mockParsedRequest)
    expect(result).toEqual(mockServiceResponse)
  })

  it('returns failure when parseImportRequest returns null', async () => {
    registerImportHandlers()

    vi.mocked(parseImportRequest).mockReturnValue(null)

    const result = await handlers[IPC_CHANNELS.sendImport](null, { invalid: 'payload' })

    expect(parseImportRequest).toHaveBeenCalledWith({ invalid: 'payload' })
    expect(ImportService.handleImportRequest).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'error',
      message: 'Invalid import request payload',
    })
  })

  it('returns failure when payload is null', async () => {
    registerImportHandlers()

    vi.mocked(parseImportRequest).mockReturnValue(null)

    const result = await handlers[IPC_CHANNELS.sendImport](null, null)

    expect(ImportService.handleImportRequest).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'error',
      message: 'Invalid import request payload',
    })
  })

  it('returns failure when payload is string', async () => {
    registerImportHandlers()

    vi.mocked(parseImportRequest).mockReturnValue(null)

    const result = await handlers[IPC_CHANNELS.sendImport](null, 'string payload')

    expect(ImportService.handleImportRequest).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'error',
      message: 'Invalid import request payload',
    })
  })
})
