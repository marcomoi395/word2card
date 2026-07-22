import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shell } from 'electron'

// Define hoisted mocks
const mocks = vi.hoisted(() => {
    const mockShow = vi.fn()
    const mockLoadURL = vi.fn()
    const mockLoadFile = vi.fn()
    const mockSetWindowOpenHandler = vi.fn()
    const mockOn = vi.fn((event: string, cb: () => void) => {
        if (event === 'ready-to-show') {
            cb() // Execute immediately for testing
        }
    })

    class MockBrowserWindow {
        show = mockShow
        loadURL = mockLoadURL
        loadFile = mockLoadFile
        on = mockOn
        webContents = {
            setWindowOpenHandler: mockSetWindowOpenHandler
        }
        constructor(public config: unknown) {}
    }

    return {
        mockShow,
        mockLoadURL,
        mockLoadFile,
        mockSetWindowOpenHandler,
        mockOn,
        MockBrowserWindow
    }
})

vi.mock('electron', () => ({
    BrowserWindow: mocks.MockBrowserWindow,
    shell: {
        openExternal: vi.fn()
    }
}))

vi.mock('@electron-toolkit/utils', () => ({
    is: {
        dev: false
    }
}))

vi.mock('../../resources/icon.png?asset', () => ({
    default: 'mock-icon-path'
}))

// Import after mocks
import { createWindow } from '../window'

describe('window.ts', () => {
    let originalPlatform: NodeJS.Platform
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        vi.clearAllMocks()
        originalPlatform = process.platform
        originalEnv = { ...process.env }
    })

    afterEach(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        })
        process.env = originalEnv
    })

    it('creates window with correct default configuration', () => {
        Object.defineProperty(process, 'platform', { value: 'win32' })

        const win = createWindow() as any

        expect(win.config).toEqual(
            expect.objectContaining({
                width: 400,
                height: 600,
                show: false,
                resizable: false,
                movable: true,
                autoHideMenuBar: true,
                icon: expect.stringContaining('icon.png'),
                webPreferences: expect.objectContaining({
                    sandbox: true,
                    contextIsolation: true,
                    nodeIntegration: false,
                    webSecurity: true
                })
            })
        )
    })

    it('adds extra icon property for linux platform', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' })

        const win = createWindow() as any

        expect((win.config as any).icon).toContain('icon.png')
    })

    it('shows window on ready-to-show event', () => {
        createWindow()

        expect(mocks.mockOn).toHaveBeenCalledWith('ready-to-show', expect.any(Function))
        expect(mocks.mockShow).toHaveBeenCalled()
    })

    it('denies window open and opens external shell instead', () => {
        createWindow()

        expect(mocks.mockSetWindowOpenHandler).toHaveBeenCalled()

        // Trigger the handler
        const handler = mocks.mockSetWindowOpenHandler.mock.calls[0][0]
        const result = handler({ url: 'https://example.com' })

        expect(shell.openExternal).toHaveBeenCalledWith('https://example.com')
        expect(result).toEqual({ action: 'deny' })
    })

    it('loads dev server URL when in dev mode', async () => {
        const utils = await import('@electron-toolkit/utils')
        // Temporarily set dev to true
        Object.defineProperty(utils.is, 'dev', { value: true, configurable: true })
        Object.defineProperty(process.env, 'ELECTRON_RENDERER_URL', {
            value: 'http://localhost:5173',
            configurable: true
        })

        createWindow()

        expect(mocks.mockLoadURL).toHaveBeenCalledWith('http://localhost:5173')
        expect(mocks.mockLoadFile).not.toHaveBeenCalled()
    })

    it('loads production file by default', () => {
        createWindow()

        expect(mocks.mockLoadFile).toHaveBeenCalledWith(expect.stringContaining('index.html'))
        expect(mocks.mockLoadURL).not.toHaveBeenCalled()
    })
})
