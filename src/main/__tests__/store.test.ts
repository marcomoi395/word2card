import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SecretManager } from '../store'
import { safeStorage } from 'electron'

// Mock electron-store module with factory
vi.mock('electron-store', () => {
  const MockStore = vi.fn()
  MockStore.prototype.get = vi.fn()
  MockStore.prototype.set = vi.fn()
  MockStore.prototype.delete = vi.fn()
  return { default: MockStore }
})

import Store from 'electron-store'

describe('SecretManager / Store', () => {
  beforeEach(() => {
    // Reset singleton instance
    ;(SecretManager as any).instance = undefined

    // Reset all mocks
    vi.clearAllMocks()

    // Reset electron mocks
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false)
  })

  describe('singleton pattern', () => {
    it('returns the same instance on multiple calls', () => {
      const instance1 = SecretManager.getInstance()
      const instance2 = SecretManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('isEncryptionAvailable', () => {
    it('returns false when safeStorage reports unavailable', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false)
      const manager = SecretManager.getInstance()
      expect(manager.isEncryptionAvailable()).toBe(false)
    })

    it('returns true when safeStorage reports available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true)
      const manager = SecretManager.getInstance()
      expect(manager.isEncryptionAvailable()).toBe(true)
    })
  })

  describe('saveSecret', () => {
    it('saves plain text when encryption unavailable', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false)

      const manager = SecretManager.getInstance()
      const result = manager.saveSecret('openaiApiKey', 'sk-123')

      expect(result).toBe(true)
      expect(Store.prototype.set).toHaveBeenCalledWith('openaiApiKey', {
        value: 'sk-123',
        encrypted: false,
      })
    })

    it('encrypts value when encryption available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true)
      vi.mocked(safeStorage.encryptString).mockReturnValue(Buffer.from('encrypted-data'))

      const manager = SecretManager.getInstance()
      const result = manager.saveSecret('openaiApiKey', 'sk-123')

      expect(result).toBe(true)
      expect(safeStorage.encryptString).toHaveBeenCalledWith('sk-123')
      expect(Store.prototype.set).toHaveBeenCalledWith('openaiApiKey', {
        value: Buffer.from('encrypted-data').toString('hex'),
        encrypted: true,
      })
    })

    it('returns false when store.set throws error', () => {
      vi.mocked(Store.prototype.set).mockImplementation(() => {
        throw new Error('Store write failed')
      })

      const manager = SecretManager.getInstance()
      const result = manager.saveSecret('openaiApiKey', 'sk-123')

      expect(result).toBe(false)
    })
  })

  describe('getSecret', () => {
    it('returns null when key does not exist', () => {
      vi.mocked(Store.prototype.get).mockReturnValue(undefined)

      const manager = SecretManager.getInstance()
      const result = manager.getSecret('openaiApiKey')

      expect(result).toBeNull()
    })

    it('returns plain text value when encrypted=false', () => {
      vi.mocked(Store.prototype.get).mockReturnValue({
        value: 'sk-123',
        encrypted: false,
      })

      const manager = SecretManager.getInstance()
      const result = manager.getSecret('openaiApiKey')

      expect(result).toBe('sk-123')
    })

    it('decrypts and returns value when encrypted=true', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true)
      vi.mocked(safeStorage.decryptString).mockReturnValue('sk-123')

      const encryptedHex = Buffer.from('encrypted-data').toString('hex')
      vi.mocked(Store.prototype.get).mockReturnValue({
        value: encryptedHex,
        encrypted: true,
      })

      const manager = SecretManager.getInstance()
      const result = manager.getSecret('openaiApiKey')

      expect(result).toBe('sk-123')
    })

    it('returns null when encrypted=true but encryption unavailable', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false)

      vi.mocked(Store.prototype.get).mockReturnValue({
        value: 'some-encrypted-hex',
        encrypted: true,
      })

      const manager = SecretManager.getInstance()
      const result = manager.getSecret('openaiApiKey')

      expect(result).toBeNull()
    })

    it('returns null when store.get throws error', () => {
      vi.mocked(Store.prototype.get).mockImplementation(() => {
        throw new Error('Store read failed')
      })

      const manager = SecretManager.getInstance()
      const result = manager.getSecret('openaiApiKey')

      expect(result).toBeNull()
    })
  })

  describe('deleteSecret', () => {
    it('calls store.delete with correct key', () => {
      const manager = SecretManager.getInstance()
      manager.deleteSecret('openaiApiKey')

      expect(Store.prototype.delete).toHaveBeenCalledWith('openaiApiKey')
    })
  })
})
