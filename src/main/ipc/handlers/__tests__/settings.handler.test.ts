import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'
import { registerSettingsHandlers } from '../settings.handler'
import { IPC_CHANNELS } from '../../../../shared/ipc'

// Mock validators
vi.mock('../../../utils/validators', () => ({
  parseSaveSettingsPayload: vi.fn(),
}))

// Mock SecretManager
vi.mock('../../../store', () => ({
  default: {
    saveSecret: vi.fn(),
    deleteSecret: vi.fn(),
  },
}))

// Mock State
vi.mock('../../../state', () => ({
  default: {
    getToken: vi.fn(),
    setToken: vi.fn(),
    removeToken: vi.fn(),
  },
}))

import { parseSaveSettingsPayload } from '../../../utils/validators'
import SecretManager from '../../../store'
import State from '../../../state'

describe('registerSettingsHandlers', () => {
  let handlers: Record<string, (...args: any[]) => Promise<any>>

  beforeEach(() => {
    vi.clearAllMocks()
    handlers = {}

    // Capture handlers registered via ipcMain.handle
    vi.spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => {
      handlers[channel] = handler as (...args: any[]) => Promise<any>
    })
  })

  describe('saveSettings handler', () => {
    it('registers saveSettings handler', () => {
      registerSettingsHandlers()
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.saveSettings, expect.any(Function))
    })

    it('returns success when all secrets saved successfully', async () => {
      registerSettingsHandlers()

      const mockPayload = {
        openaiApiKey: 'openai-key',
        azureApiKey: 'azure-key',
        pexelsToken: 'pexels-token',
      }

      vi.mocked(parseSaveSettingsPayload).mockReturnValue(mockPayload)
      vi.mocked(SecretManager.saveSecret).mockReturnValue(true)

      const result = await handlers[IPC_CHANNELS.saveSettings](null, mockPayload)

      expect(SecretManager.saveSecret).toHaveBeenCalledWith('openaiApiKey', 'openai-key')
      expect(SecretManager.saveSecret).toHaveBeenCalledWith('azureApiKey', 'azure-key')
      expect(SecretManager.saveSecret).toHaveBeenCalledWith('pexelsToken', 'pexels-token')
      expect(State.setToken).toHaveBeenCalledWith('openaiApiKey', 'openai-key')
      expect(State.setToken).toHaveBeenCalledWith('azureApiKey', 'azure-key')
      expect(State.setToken).toHaveBeenCalledWith('pexelsToken', 'pexels-token')
      expect(result).toEqual({
        status: 'success',
        message: 'Settings saved successfully',
      })
    })

    it('trims values before saving', async () => {
      registerSettingsHandlers()

      const mockPayload = {
        openaiApiKey: '  openai-key  ',
        azureApiKey: '  azure-key  ',
        pexelsToken: '  pexels-token  ',
      }

      vi.mocked(parseSaveSettingsPayload).mockReturnValue(mockPayload)
      vi.mocked(SecretManager.saveSecret).mockReturnValue(true)

      await handlers[IPC_CHANNELS.saveSettings](null, mockPayload)

      expect(SecretManager.saveSecret).toHaveBeenCalledWith('openaiApiKey', 'openai-key')
      expect(State.setToken).toHaveBeenCalledWith('openaiApiKey', 'openai-key')
    })

    it('deletes secret and removes token when value is empty', async () => {
      registerSettingsHandlers()

      const mockPayload = {
        openaiApiKey: '',
        azureApiKey: 'azure-key',
        pexelsToken: 'pexels-token',
      }

      vi.mocked(parseSaveSettingsPayload).mockReturnValue(mockPayload)
      vi.mocked(SecretManager.saveSecret).mockReturnValue(true)

      await handlers[IPC_CHANNELS.saveSettings](null, mockPayload)

      expect(SecretManager.deleteSecret).toHaveBeenCalledWith('openaiApiKey')
      expect(State.removeToken).toHaveBeenCalledWith('openaiApiKey')
      expect(SecretManager.saveSecret).toHaveBeenCalledWith('azureApiKey', 'azure-key')
      expect(SecretManager.saveSecret).toHaveBeenCalledWith('pexelsToken', 'pexels-token')
    })

    it('deletes secret when value is only whitespace', async () => {
      registerSettingsHandlers()

      const mockPayload = {
        openaiApiKey: '   ',
        azureApiKey: 'azure-key',
        pexelsToken: 'pexels-token',
      }

      vi.mocked(parseSaveSettingsPayload).mockReturnValue(mockPayload)
      vi.mocked(SecretManager.saveSecret).mockReturnValue(true)

      await handlers[IPC_CHANNELS.saveSettings](null, mockPayload)

      expect(SecretManager.deleteSecret).toHaveBeenCalledWith('openaiApiKey')
      expect(State.removeToken).toHaveBeenCalledWith('openaiApiKey')
    })

    it('returns failure when parseSaveSettingsPayload returns null', async () => {
      registerSettingsHandlers()

      vi.mocked(parseSaveSettingsPayload).mockReturnValue(null)

      const result = await handlers[IPC_CHANNELS.saveSettings](null, { invalid: 'payload' })

      expect(SecretManager.saveSecret).not.toHaveBeenCalled()
      expect(result).toEqual({
        status: 'error',
        message: 'Invalid settings payload',
      })
    })

    it('returns failure when any saveSecret returns false', async () => {
      registerSettingsHandlers()

      const mockPayload = {
        openaiApiKey: 'openai-key',
        azureApiKey: 'azure-key',
        pexelsToken: 'pexels-token',
      }

      vi.mocked(parseSaveSettingsPayload).mockReturnValue(mockPayload)
      vi.mocked(SecretManager.saveSecret)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)

      const result = await handlers[IPC_CHANNELS.saveSettings](null, mockPayload)

      expect(result).toEqual({
        status: 'error',
        message: 'Failed to save some settings',
      })
    })
  })

  describe('getSecret handler', () => {
    it('registers getSecret handler', () => {
      registerSettingsHandlers()
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.getSecret, expect.any(Function))
    })

    it('returns success with all secrets from State', async () => {
      registerSettingsHandlers()

      vi.mocked(State.getToken)
        .mockReturnValueOnce('openai-key')
        .mockReturnValueOnce('azure-key')
        .mockReturnValueOnce('pexels-token')
        .mockReturnValueOnce('notion-token')
        .mockReturnValueOnce('db-id')

      const result = await handlers[IPC_CHANNELS.getSecret]()

      expect(result).toEqual({
        status: 'success',
        data: {
          openaiApiKey: 'openai-key',
          azureApiKey: 'azure-key',
          pexelsToken: 'pexels-token',
          notionToken: 'notion-token',
          notionDatabaseId: 'db-id',
        },
      })
    })

    it('returns empty strings for unset tokens', async () => {
      registerSettingsHandlers()

      vi.mocked(State.getToken).mockReturnValue(undefined)

      const result = await handlers[IPC_CHANNELS.getSecret]()

      expect(result).toEqual({
        status: 'success',
        data: {
          openaiApiKey: '',
          azureApiKey: '',
          pexelsToken: '',
          notionToken: '',
          notionDatabaseId: '',
        },
      })
    })

    it('returns failure when exception occurs', async () => {
      registerSettingsHandlers()

      vi.mocked(State.getToken).mockImplementation(() => {
        throw new Error('State error')
      })

      const result = await handlers[IPC_CHANNELS.getSecret]()

      expect(result).toEqual({
        status: 'error',
        message: 'State error',
      })
    })
  })
})
