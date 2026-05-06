import { safeStorage } from 'electron'
import Store from 'electron-store'
import type { SecretKey } from '../shared/ipc'

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
