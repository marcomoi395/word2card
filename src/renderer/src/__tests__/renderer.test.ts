// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// This test runs in jsdom environment (configured via vitest.config.ts environmentMatchGlobs)

describe('Renderer UI', () => {
    beforeEach(async () => {
        // Reset modules to get fresh renderer instance
        vi.resetModules()

        // Load actual HTML into jsdom
        const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')
        document.documentElement.innerHTML = html

        // Mock window.api (preload bridge)
        ;(window as any).api = {
            minimize: vi.fn(),
            close: vi.fn(),
            platform: 'linux' as NodeJS.Platform,
            getFilePath: vi.fn((file: File) => `/mock/${file.name}`),
            openFileDialog: vi.fn(),
            sendImport: vi.fn(),
            saveSettings: vi.fn(),
            getSecret: vi.fn().mockResolvedValue({
                status: 'success',
                data: {
                    openaiApiKey: 'test-openai',
                    azureApiKey: 'test-azure',
                    pexelsToken: 'test-pexels',
                    notionToken: 'test-notion',
                    notionDatabaseId: 'test-db-id'
                }
            })
        }

        // Mock alert
        vi.spyOn(window, 'alert').mockImplementation(() => {})

        // Import renderer to initialize event listeners
        await import('../renderer')

        // Dispatch DOMContentLoaded to trigger init()
        window.dispatchEvent(new Event('DOMContentLoaded'))
    })

    describe('Initialization', () => {
        it('renders all main sections in DOM', () => {
            expect(document.getElementById('section-import')).toBeTruthy()
            expect(document.getElementById('section-notion')).toBeTruthy()
            expect(document.getElementById('section-settings')).toBeTruthy()
        })

        it('calls getSecret on load', () => {
            expect(window.api.getSecret).toHaveBeenCalled()
        })

        it('populates settings inputs from getSecret response', async () => {
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            const openaiInput = document.getElementById('openai-key-global') as HTMLInputElement
            const azureInput = document.getElementById('azure-key-global') as HTMLInputElement
            const pexelsInput = document.getElementById('pexels-token-global') as HTMLInputElement

            expect(openaiInput?.value).toBe('test-openai')
            expect(azureInput?.value).toBe('test-azure')
            expect(pexelsInput?.value).toBe('test-pexels')
        })

        it('handles getSecret returning error status gracefully', async () => {
            vi.mocked(window.api.getSecret).mockResolvedValueOnce({
                status: 'error',
                message: 'Failed to load secrets'
            })
            window.dispatchEvent(new Event('DOMContentLoaded'))
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            const openaiInput = document.getElementById('openai-key-global') as HTMLInputElement
            expect(openaiInput?.value).toBe('test-openai')
        })

        it('handles getSecret returning success but no data', async () => {
            vi.mocked(window.api.getSecret).mockResolvedValueOnce({
                status: 'success'
            })
            window.dispatchEvent(new Event('DOMContentLoaded'))
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            const openaiInput = document.getElementById('openai-key-global') as HTMLInputElement
            expect(openaiInput?.value).toBe('test-openai')
        })

        it('handles getSecret throwing error', async () => {
            vi.mocked(window.api.getSecret).mockRejectedValueOnce(new Error('Network error'))
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            window.dispatchEvent(new Event('DOMContentLoaded'))
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })
    })

    describe('Settings Form', () => {
        it('does not show alert when saveSettings returns success', async () => {
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            const saveButton = document.getElementById('btn-save-settings') as HTMLButtonElement

            vi.mocked(window.api.saveSettings).mockResolvedValue({
                status: 'success'
            })

            saveButton.click()

            const { promise: p2, resolve: r2 } = Promise.withResolvers<void>()
            setTimeout(r2, 10)
            await p2

            // Success feedback is provided by button state, not alert
            expect(window.alert).not.toHaveBeenCalled()
        })
        it('calls saveSettings with correct payload when Save clicked', async () => {
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            const openaiInput = document.getElementById('openai-key-global') as HTMLInputElement
            const azureInput = document.getElementById('azure-key-global') as HTMLInputElement
            const pexelsInput = document.getElementById('pexels-token-global') as HTMLInputElement
            const saveButton = document.getElementById('btn-save-settings') as HTMLButtonElement

            openaiInput.value = 'new-openai-key'
            azureInput.value = 'new-azure-key'
            pexelsInput.value = 'new-pexels-token'

            vi.mocked(window.api.saveSettings).mockResolvedValue({
                status: 'success',
                message: 'Settings saved successfully'
            })

            saveButton.click()

            const { promise: p2, resolve: r2 } = Promise.withResolvers<void>()
            setTimeout(r2, 10)
            await p2

            expect(window.api.saveSettings).toHaveBeenCalledWith({
                openaiApiKey: 'new-openai-key',
                azureApiKey: 'new-azure-key',
                pexelsToken: 'new-pexels-token'
            })
        })

        it('shows error alert when saveSettings returns error', async () => {
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            const saveButton = document.getElementById('btn-save-settings') as HTMLButtonElement

            vi.mocked(window.api.saveSettings).mockResolvedValue({
                status: 'error',
                message: 'Failed to save'
            })

            saveButton.click()

            const { promise: p2, resolve: r2 } = Promise.withResolvers<void>()
            setTimeout(r2, 10)
            await p2

            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('Failed to save settings: Failed to save')
            )
        })

        it('shows error alert when saveSettings returns error without message', async () => {
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            const saveButton = document.getElementById('btn-save-settings') as HTMLButtonElement

            vi.mocked(window.api.saveSettings).mockResolvedValue({
                status: 'error'
            } as any)

            saveButton.click()

            const { promise: p2, resolve: r2 } = Promise.withResolvers<void>()
            setTimeout(r2, 10)
            await p2

            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('Failed to save settings: undefined')
            )
        })

        it('shows error alert when saveSettings throws error', async () => {
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            const saveButton = document.getElementById('btn-save-settings') as HTMLButtonElement

            vi.mocked(window.api.saveSettings).mockRejectedValue(new Error('Network error'))
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            saveButton.click()

            const { promise: p2, resolve: r2 } = Promise.withResolvers<void>()
            setTimeout(r2, 10)
            await p2

            expect(consoleSpy).toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('An error occurred while saving settings.')
            )
            consoleSpy.mockRestore()
        })
    })

    describe('File Import Flow', () => {
        it('calls openFileDialog when file input clicked', async () => {
            const fileInput = document.getElementById('source-file') as HTMLInputElement

            vi.mocked(window.api.openFileDialog).mockResolvedValue({
                status: 'success',
                data: { filePath: '/path/to/file.txt' }
            })

            fileInput.click()

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(window.api.openFileDialog).toHaveBeenCalled()
        })

        it('populates file input when openFileDialog returns path', async () => {
            const fileInput = document.getElementById('source-file') as HTMLInputElement

            vi.mocked(window.api.openFileDialog).mockResolvedValue({
                status: 'success',
                data: { filePath: '/path/to/selected.txt' }
            })

            fileInput.click()

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(fileInput.value).toBe('/path/to/selected.txt')
        })

        it('does not change input when openFileDialog returns null', async () => {
            const fileInput = document.getElementById('source-file') as HTMLInputElement
            fileInput.value = '/existing/path.txt'

            vi.mocked(window.api.openFileDialog).mockResolvedValue({
                status: 'success',
                data: { filePath: null }
            })

            fileInput.click()

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(fileInput.value).toBe('/existing/path.txt')
        })

        it('calls sendImport with FILE_IMPORT when form submitted', async () => {
            const form = document.getElementById('form-import') as HTMLFormElement
            const fileInput = document.getElementById('source-file') as HTMLInputElement
            const deckInput = form.elements.namedItem('deck') as HTMLInputElement
            const quizCheckbox = document.getElementById('chk-quiz-import') as HTMLInputElement

            fileInput.value = '/path/to/file.txt'
            deckInput.value = 'TestDeck'
            quizCheckbox.checked = true

            vi.mocked(window.api.sendImport).mockResolvedValue({
                status: 'success',
                message: '10 items imported'
            })

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(window.api.sendImport).toHaveBeenCalledWith({
                type: 'FILE_IMPORT',
                payload: {
                    filePath: '/path/to/file.txt',
                    deck: 'TestDeck',
                    options: {
                        quiz: true,
                        flashcard: false
                    }
                }
            })
        })

        it('does not call sendImport when file path missing', async () => {
            const form = document.getElementById('form-import') as HTMLFormElement
            const fileInput = document.getElementById('source-file') as HTMLInputElement

            fileInput.value = ''

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(window.api.sendImport).not.toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('source file'))
        })

        it('does not call sendImport when both options are unchecked', async () => {
            const form = document.getElementById('form-import') as HTMLFormElement
            const fileInput = document.getElementById('source-file') as HTMLInputElement
            const deckInput = form.elements.namedItem('deck') as HTMLInputElement
            const quizCheckbox = document.getElementById('chk-quiz-import') as HTMLInputElement
            const flashcardCheckbox = document.getElementById(
                'chk-flashcard-import'
            ) as HTMLInputElement

            fileInput.value = '/path/to/file.txt'
            deckInput.value = 'TestDeck'
            quizCheckbox.checked = false
            flashcardCheckbox.checked = false

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(window.api.sendImport).not.toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('Please select at least one import option')
            )
        })

        it('shows error alert when sendImport throws error', async () => {
            const form = document.getElementById('form-import') as HTMLFormElement
            const fileInput = document.getElementById('source-file') as HTMLInputElement
            const quizCheckbox = document.getElementById('chk-quiz-import') as HTMLInputElement

            fileInput.value = '/path/to/file.txt'
            quizCheckbox.checked = true

            vi.mocked(window.api.sendImport).mockRejectedValue(new Error('Network error'))
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 10)
            await promise

            expect(consoleSpy).toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('An error occurred during import.')
            )
            consoleSpy.mockRestore()
        })
    })

    describe('Notion Sync Flow', () => {
        it('calls sendImport with NOTION_SYNC when form submitted', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement
            const tokenInput = document.getElementById('notion-token') as HTMLInputElement
            const dbInput = document.getElementById('notion-database-id') as HTMLInputElement
            const deckInput = form.elements.namedItem('deck') as HTMLInputElement
            const flashcardCheckbox = document.getElementById(
                'chk-flashcard-notion'
            ) as HTMLInputElement

            tokenInput.value = 'notion-token-123'
            dbInput.value = 'db-id-456'
            deckInput.value = 'NotionDeck'
            flashcardCheckbox.checked = true

            vi.mocked(window.api.sendImport).mockResolvedValue({
                status: 'success',
                message: '5 items synced'
            })

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(window.api.sendImport).toHaveBeenCalledWith({
                type: 'NOTION_SYNC',
                payload: {
                    token: 'notion-token-123',
                    notionDatabaseId: 'db-id-456',
                    deck: 'NotionDeck',
                    options: {
                        quiz: false,
                        flashcard: true
                    }
                }
            })
        })

        it('does not call sendImport when token missing', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement
            const tokenInput = document.getElementById('notion-token') as HTMLInputElement
            const dbInput = document.getElementById('notion-database-id') as HTMLInputElement

            tokenInput.value = ''
            dbInput.value = 'db-id'

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(window.api.sendImport).not.toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Notion token'))
        })

        it('does not call sendImport when database ID missing', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement
            const tokenInput = document.getElementById('notion-token') as HTMLInputElement
            const dbInput = document.getElementById('notion-database-id') as HTMLInputElement

            tokenInput.value = 'token'
            dbInput.value = ''

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(window.api.sendImport).not.toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('database ID'))
        })

        it('does not call sendImport when both options are unchecked', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement
            const tokenInput = document.getElementById('notion-token') as HTMLInputElement
            const dbInput = document.getElementById('notion-database-id') as HTMLInputElement
            const quizCheckbox = document.getElementById('chk-quiz-notion') as HTMLInputElement
            const flashcardCheckbox = document.getElementById(
                'chk-flashcard-notion'
            ) as HTMLInputElement

            tokenInput.value = 'token'
            dbInput.value = 'db-id'
            quizCheckbox.checked = false
            flashcardCheckbox.checked = false

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(window.api.sendImport).not.toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('Please select at least one import option')
            )
        })

        it('shows error alert when sendImport throws error', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement
            const tokenInput = document.getElementById('notion-token') as HTMLInputElement
            const dbInput = document.getElementById('notion-database-id') as HTMLInputElement
            const flashcardCheckbox = document.getElementById(
                'chk-flashcard-notion'
            ) as HTMLInputElement

            tokenInput.value = 'token'
            dbInput.value = 'db-id'
            flashcardCheckbox.checked = true

            vi.mocked(window.api.sendImport).mockRejectedValue(new Error('Network error'))
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 10)
            await promise

            expect(consoleSpy).toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('An error occurred during sync.')
            )
            consoleSpy.mockRestore()
        })
    })

    describe('Window Controls', () => {
        it('calls minimize when minimize button clicked', async () => {
            const btn = document.getElementById('minimize-btn')
            btn?.click()
            expect(window.api.minimize).toHaveBeenCalled()
        })

        it('calls close when close button clicked', async () => {
            const btn = document.getElementById('close-btn')
            btn?.click()
            expect(window.api.close).toHaveBeenCalled()
        })
    })

    describe('Tab Switching', () => {
        it('switches to notion tab', async () => {
            const btn = document.getElementById('tab-notion-btn')
            btn?.removeAttribute('onclick')
            btn?.click()
            expect(
                document.getElementById('section-notion')?.classList.contains('active-section')
            ).toBe(true)
        })

        it('switches to settings tab', async () => {
            const btn = document.getElementById('tab-settings-btn')
            btn?.removeAttribute('onclick')
            btn?.click()
            expect(
                document.getElementById('section-settings')?.classList.contains('active-section')
            ).toBe(true)
        })

        it('switches to import tab', async () => {
            const btn = document.getElementById('tab-import-btn')
            btn?.removeAttribute('onclick')
            btn?.click()
            expect(
                document.getElementById('section-import')?.classList.contains('active-section')
            ).toBe(true)
        })
    })

    describe('Drag and Drop', () => {
        it('prevents default on dragover', () => {
            const dropzone = document.body
            const event = new Event('dragover')
            const preventSpy = vi.spyOn(event, 'preventDefault')
            dropzone?.dispatchEvent(event)
            expect(preventSpy).toHaveBeenCalled()
        })

        it('handles file drop', () => {
            const dropzone = document.body
            const file = new File(['test'], 'test.txt', { type: 'text/plain' })

            const dataTransfer = { files: [file] }
            const event = new Event('drop') as any
            event.dataTransfer = dataTransfer

            vi.mocked(window.api.getFilePath).mockReturnValue('/mock/test.txt')

            dropzone?.dispatchEvent(event)

            const fileInput = document.getElementById('source-file') as HTMLInputElement
            expect(fileInput.value).toBe('/mock/test.txt')
        })
    })
})
