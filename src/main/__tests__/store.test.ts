import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SecretManager, createSecretPersistence } from '../store'
import { resetSecretManager } from '../../../test/helpers/singleton-reset'

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
        // Reset singleton instance to prevent test contamination
        resetSecretManager(SecretManager)

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
                encrypted: false
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
                encrypted: true
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
                encrypted: false
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
                encrypted: true
            })

            const manager = SecretManager.getInstance()
            const result = manager.getSecret('openaiApiKey')

            expect(result).toBe('sk-123')
        })

        it('returns null when encrypted=true but encryption unavailable', () => {
            vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false)

            vi.mocked(Store.prototype.get).mockReturnValue({
                value: 'some-encrypted-hex',
                encrypted: true
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

describe('typed state persistence adapter', () => {
    it('loads and saves complete runtime settings through SecretManager', () => {
        const manager = {
            getSecret: vi.fn((key: string) => (key === 'openaiApiKey' ? 'existing-key' : null)),
            saveSecret: vi.fn(() => true),
            deleteSecret: vi.fn()
        }

        const persistence = createSecretPersistence(manager)

        expect(persistence.load()).toEqual({ openaiApiKey: 'existing-key' })
        expect(persistence.save({ openaiApiKey: 'new-key', azureApiKey: 'azure-key' })).toBe(true)
        expect(manager.saveSecret).toHaveBeenCalledWith('openaiApiKey', 'new-key')
        expect(manager.saveSecret).toHaveBeenCalledWith('azureApiKey', 'azure-key')
    })

    it('restores earlier writes when a later setting fails', () => {
        const values: Partial<Record<'openaiApiKey' | 'azureApiKey', string>> = {
            openaiApiKey: 'old-key'
        }
        const manager = {
            getSecret: vi.fn((key: 'openaiApiKey' | 'azureApiKey') => values[key] ?? null),
            saveSecret: vi.fn((key: 'openaiApiKey' | 'azureApiKey', value: string) => {
                if (key === 'azureApiKey') {
                    return false
                }
                values[key] = value
                return true
            }),
            deleteSecret: vi.fn((key: 'openaiApiKey' | 'azureApiKey') => {
                delete values[key]
            })
        }

        expect(
            createSecretPersistence(manager).save({
                openaiApiKey: 'new-key',
                azureApiKey: 'azure-key'
            })
        ).toBe(false)
        expect(values.openaiApiKey).toBe('old-key')
    })

    it('deletes newly written keys during rollback when no prior value exists', () => {
        const manager = {
            getSecret: vi.fn(() => null),
            saveSecret: vi.fn((key: string) => key !== 'azureApiKey'),
            deleteSecret: vi.fn()
        }

        expect(
            createSecretPersistence(manager).save({
                openaiApiKey: 'new-key',
                azureApiKey: 'azure-key'
            })
        ).toBe(false)
        expect(manager.deleteSecret).toHaveBeenCalledWith('openaiApiKey')
    })
})
