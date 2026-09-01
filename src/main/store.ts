import { safeStorage } from 'electron'
import Store from 'electron-store'
import type { SecretKey } from '../shared/ipc'

import type { StatePersistence } from './state/persistence'

export interface SecretPersistenceManager {
    getSecret(key: SecretKey): string | null
    saveSecret(key: SecretKey, value: string): boolean
    deleteSecret(key: SecretKey): void
}

const SECRET_KEYS: SecretKey[] = [
    'openaiApiKey',
    'azureApiKey',
    'pexelsToken',
    'notionToken',
    'notionDatabaseId'
]

export const createSecretPersistence = (manager: SecretPersistenceManager): StatePersistence => ({
    load: () =>
        Object.fromEntries(
            SECRET_KEYS.flatMap((key) => {
                const value = manager.getSecret(key)
                return value ? [[key, value]] : []
            })
        ) as Partial<Record<SecretKey, string>>,
    save: (settings) => {
        const previous = Object.fromEntries(
            SECRET_KEYS.flatMap((key) => {
                const value = manager.getSecret(key)
                return value ? [[key, value]] : []
            })
        ) as Partial<Record<SecretKey, string>>
        const applied: SecretKey[] = []

        for (const key of SECRET_KEYS) {
            const value = settings[key]
            const succeeded = value
                ? manager.saveSecret(key, value)
                : (manager.deleteSecret(key), true)

            if (!succeeded) {
                for (const appliedKey of applied) {
                    const previousValue = previous[appliedKey]
                    if (previousValue) {
                        manager.saveSecret(appliedKey, previousValue)
                    } else {
                        manager.deleteSecret(appliedKey)
                    }
                }
                return false
            }

            applied.push(key)
        }

        return true
    },
    delete: (key) => {
        try {
            manager.deleteSecret(key)
            return true
        } catch {
            return false
        }
    }
})

interface SecretItem {
    value: string
    encrypted: boolean
}

type SecretStoreSchema = Partial<Record<SecretKey, SecretItem>>

export class SecretManager {
    private static instance: SecretManager
    private store: Store<SecretStoreSchema>

    private constructor() {
        this.store = new Store<SecretStoreSchema>({
            name: 'secrets',
            fileExtension: 'json'
        })
    }

    public static getInstance(): SecretManager {
        if (!SecretManager.instance) {
            SecretManager.instance = new SecretManager()
        }
        return SecretManager.instance
    }

    public isEncryptionAvailable(): boolean {
        return safeStorage.isEncryptionAvailable()
    }

    public saveSecret(key: SecretKey, value: string): boolean {
        try {
            let encrypted = false
            if (this.isEncryptionAvailable()) {
                encrypted = true
                const encryptedBuffer = safeStorage.encryptString(value)
                value = encryptedBuffer.toString('hex')
            }

            this.store.set(key, {
                value,
                encrypted
            })
            return true
        } catch (error) {
            console.error('Save failed:', error)
            return false
        }
    }

    public getSecret(key: SecretKey): string | null {
        try {
            const item = this.store.get(key)
            if (!item) {
                return null
            }

            if (item.encrypted) {
                if (!this.isEncryptionAvailable()) {
                    return null
                }

                const encryptedBuffer = Buffer.from(item.value, 'hex')
                return safeStorage.decryptString(encryptedBuffer)
            }

            return item.value
        } catch (error) {
            console.error('Read error:', error)
            return null
        }
    }

    public deleteSecret(key: SecretKey): void {
        this.store.delete(key)
    }
}

export default SecretManager.getInstance()
