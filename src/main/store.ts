import { safeStorage } from 'electron'
import Store from 'electron-store'

interface SecretItem {
    value: string
    encrypted: boolean
}

interface SecretStoreSchema {
    [key: string]: SecretItem
}
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

    public saveSecret(key: string, value: string): boolean {
        try {
            let encrypted: boolean = false
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

    public getSecret(key: string): string | null {
        try {
            const item = this.store.get(key) as SecretItem | undefined

            if (!item) {
                return null
            }

            if (item.encrypted) {
                if (this.isEncryptionAvailable()) {
                    const encryptedBuffer = Buffer.from(item.value, 'hex')
                    const decryptedString = safeStorage.decryptString(encryptedBuffer)

                    return decryptedString
                } else {
                    return null
                }
            }

            return item.value
        } catch (error) {
            console.error('Read error:', error)
            return null
        }
    }

    public deleteSecret(key: string): void {
        this.store.delete(key as any)
    }
}

export default SecretManager.getInstance()
