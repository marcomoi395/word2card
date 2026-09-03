import { afterEach, vi } from 'vitest'

// Mock Electron modules
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name: string) => `/mock/path/${name}`),
        getName: vi.fn(() => 'word2card')
    },
    ipcMain: {
        handle: vi.fn(),
        on: vi.fn(),
        removeHandler: vi.fn()
    },
    ipcRenderer: {
        invoke: vi.fn(),
        send: vi.fn(),
        on: vi.fn()
    },
    dialog: {
        showOpenDialog: vi.fn()
    },
    BrowserWindow: vi.fn(() => ({
        minimize: vi.fn(),
        close: vi.fn()
    })),
    safeStorage: {
        isEncryptionAvailable: vi.fn(() => false),
        encryptString: vi.fn((s: string) => Buffer.from(s)),
        decryptString: vi.fn((b: Buffer) => b.toString())
    }
}))

vi.mock('electron-store', () => ({
    default: vi.fn().mockImplementation(() => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn()
    }))
}))

afterEach(() => {
    vi.clearAllMocks()
})
