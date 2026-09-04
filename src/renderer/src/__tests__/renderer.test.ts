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
        ;(window as any).api = {
            minimize: vi.fn(),
            close: vi.fn(),
            platform: 'linux' as NodeJS.Platform,
            getFilePath: vi.fn((file: File) => `/mock/${file.name}`),
            openFileDialog: vi.fn(),
            sendImport: vi.fn(),
            listVocabulary: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
            createVocabulary: vi.fn(),
            updateVocabulary: vi.fn(),
            deleteVocabulary: vi.fn(),
            getProviderHealth: vi.fn().mockResolvedValue({
                status: 'success',
                data: {
                    providers: {
                        openai: { provider: 'openai', state: 'connected' },
                        notion: { provider: 'notion', state: 'connected' },
                        pexels: { provider: 'pexels', state: 'connected' },
                        anki: { provider: 'anki', state: 'connected' }
                    }
                }
            }),
            getAnkiHealth: vi.fn().mockResolvedValue({
                status: 'success',
                data: { provider: 'anki', state: 'connected' }
            }),
            saveSettings: vi.fn(),
            getSettingsStatus: vi.fn().mockResolvedValue({
                status: 'success',
                data: {
                    configured: {
                        openaiApiKey: true,
                        azureApiKey: true,
                        pexelsToken: true,
                        notionToken: true,
                        notionDatabaseId: true
                    }
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
        it('omits the meaning column from import and collection tables', () => {
            for (const selector of [
                '#section-import .data-grid',
                '#section-collection .data-grid'
            ]) {
                const table = document.querySelector<HTMLTableElement>(selector)
                expect(table?.querySelector('th:nth-child(8)')?.textContent?.trim()).not.toBe(
                    'Meaning'
                )
                expect(table?.querySelectorAll('thead th')).toHaveLength(10)
                expect(
                    table?.querySelector('tbody td[role="status"]')?.getAttribute('colspan')
                ).toBe('10')
            }
        })
        it('calls getSettingsStatus on load', () => {
            expect(window.api.getSettingsStatus).toHaveBeenCalled()
        })

        it('does not populate secret inputs from settings status', async () => {
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect((document.getElementById('openai-key-global') as HTMLInputElement).value).toBe(
                ''
            )
            expect((document.getElementById('azure-key-global') as HTMLInputElement).value).toBe('')
            expect((document.getElementById('pexels-token-global') as HTMLInputElement).value).toBe(
                ''
            )
        })

        it('handles settings status errors gracefully', async () => {
            vi.mocked(window.api.getSettingsStatus).mockResolvedValueOnce({
                status: 'error',
                message: 'Failed to load settings status'
            })
            window.dispatchEvent(new Event('DOMContentLoaded'))
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect((document.getElementById('openai-key-global') as HTMLInputElement).value).toBe(
                ''
            )
        })

        it('handles settings status request errors', async () => {
            vi.mocked(window.api.getSettingsStatus).mockRejectedValueOnce(
                new Error('Network error')
            )
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            window.dispatchEvent(new Event('DOMContentLoaded'))
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })

        it('shows configured status without exposing secret values', async () => {
            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(document.getElementById('openai-key-status')?.textContent).toBe('Configured')
            expect(document.getElementById('azure-key-status')?.textContent).toBe('Configured')
            expect(document.getElementById('pexels-token-status')?.textContent).toBe('Configured')
        })

        it('uses password controls for secret inputs', () => {
            expect((document.getElementById('openai-key-global') as HTMLInputElement).type).toBe(
                'password'
            )
            expect((document.getElementById('azure-key-global') as HTMLInputElement).type).toBe(
                'password'
            )
            expect((document.getElementById('pexels-token-global') as HTMLInputElement).type).toBe(
                'password'
            )
        })
        it('uses red status dots for providers that are not connected', async () => {
            vi.mocked(window.api.getProviderHealth).mockResolvedValue({
                status: 'success',
                data: {
                    providers: {
                        openai: { provider: 'openai', state: 'unreachable' },
                        notion: { provider: 'notion', state: 'not_configured' },
                        pexels: { provider: 'pexels', state: 'invalid' },
                        anki: { provider: 'anki', state: 'connected' }
                    }
                }
            })
            window.dispatchEvent(new Event('DOMContentLoaded'))
            await Promise.resolve()
            await Promise.resolve()

            expect(
                document
                    .querySelector('.connection-item[data-provider="openai"] .status-dot')
                    ?.classList.contains('disconnected')
            ).toBe(true)
            expect(
                document.querySelector('.connection-item[data-provider="notion"] .status-dot')
            ).toBeNull()
            expect(
                document
                    .querySelector('.connection-item[data-provider="pexels"] .status-dot')
                    ?.classList.contains('disconnected')
            ).toBe(true)
            expect(
                document
                    .querySelector('.connection-item[data-provider="anki"] .status-dot')
                    ?.classList.contains('connected')
            ).toBe(true)
            expect(document.getElementById('notion-status-title')?.textContent).toBe(
                'Notion not configured'
            )
            expect(document.getElementById('notion-status-note')?.textContent).toBe(
                'not configured'
            )
            expect(
                document.getElementById('notion-status-dot')?.classList.contains('disconnected')
            ).toBe(true)
        })
    })
    it('loads and saves OpenAI base URL and model settings', async () => {
        vi.mocked(window.api.getSettingsStatus).mockResolvedValueOnce({
            status: 'success',
            data: {
                configured: {
                    openaiApiKey: true,
                    openaiBaseUrl: true,
                    openaiModel: true,
                    azureApiKey: false,
                    pexelsToken: false,
                    notionToken: false,
                    notionDatabaseId: false
                },
                openaiBaseUrl: 'https://custom.example/v1',
                openaiModel: 'custom-model'
            }
        })
        window.dispatchEvent(new Event('DOMContentLoaded'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect((document.getElementById('openai-base-url') as HTMLInputElement).value).toBe(
            'https://custom.example/v1'
        )
        expect((document.getElementById('openai-model') as HTMLInputElement).value).toBe(
            'custom-model'
        )

        ;(document.getElementById('openai-base-url') as HTMLInputElement).value =
            'https://another.example/v1'
        ;(document.getElementById('openai-model') as HTMLInputElement).value = 'another-model'
        vi.mocked(window.api.saveSettings).mockResolvedValue({ status: 'success' })
        document.getElementById('btn-save-settings')?.dispatchEvent(new MouseEvent('click'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(window.api.saveSettings).toHaveBeenCalledWith(
            expect.objectContaining({
                openaiBaseUrl: 'https://another.example/v1',
                openaiModel: 'another-model'
            })
        )
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
            const notionTokenInput = document.getElementById(
                'notion-token-global'
            ) as HTMLInputElement
            const notionDatabaseIdInput = document.getElementById(
                'notion-database-id-global'
            ) as HTMLInputElement
            const saveButton = document.getElementById('btn-save-settings') as HTMLButtonElement

            openaiInput.value = 'new-openai-key'
            azureInput.value = 'new-azure-key'
            pexelsInput.value = 'new-pexels-token'
            notionTokenInput.value = 'new-notion-token'
            notionDatabaseIdInput.value = 'new-notion-database-id'

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
                pexelsToken: 'new-pexels-token',
                notionToken: 'new-notion-token',
                notionDatabaseId: 'new-notion-database-id',
                openaiBaseUrl: '',
                openaiModel: ''
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

            expect(document.getElementById('app-toast')?.textContent).toContain(
                'Failed to save settings: Failed to save'
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

            expect(document.getElementById('app-toast')?.textContent).toContain(
                'Failed to save settings: Unknown error.'
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
            expect(document.getElementById('app-toast')?.textContent).toContain(
                'An error occurred while saving settings.'
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

            fileInput.value = '/path/to/file.txt'
            deckInput.value = 'TestDeck'

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
                        quiz: false,
                        flashcard: true
                    }
                }
            })
        })
        it('shows duplicate count after a file import with skipped words', async () => {
            const form = document.getElementById('form-import') as HTMLFormElement
            const fileInput = document.getElementById('source-file') as HTMLInputElement

            fileInput.value = '/path/to/file.txt'
            vi.mocked(window.api.sendImport).mockResolvedValue({
                status: 'success',
                data: { inserted: 0, skipped: 3, failed: 0, records: [] }
            })

            form.dispatchEvent(new Event('submit'))
            await Promise.resolve()
            await Promise.resolve()

            expect(document.getElementById('app-toast')?.textContent).toContain('3 duplicate(s)')
        })

        it('does not show an alert after a fully successful file import', async () => {
            const form = document.getElementById('form-import') as HTMLFormElement
            const fileInput = document.getElementById('source-file') as HTMLInputElement

            fileInput.value = '/path/to/file.txt'
            vi.mocked(window.api.sendImport).mockResolvedValue({
                status: 'success',
                data: { inserted: 3, skipped: 0, failed: 0, records: [] }
            })

            form.dispatchEvent(new Event('submit'))
            await Promise.resolve()
            await Promise.resolve()

            expect(document.getElementById('app-toast')?.hidden).toBe(true)
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
            expect(document.getElementById('app-toast')?.textContent).toContain('source file')
        })

        it('uses flashcard format without a format selection', async () => {
            const form = document.getElementById('form-import') as HTMLFormElement
            const fileInput = document.getElementById('source-file') as HTMLInputElement
            const deckInput = form.elements.namedItem('deck') as HTMLInputElement

            fileInput.value = '/path/to/file.txt'
            deckInput.value = 'TestDeck'

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
                        quiz: false,
                        flashcard: true
                    }
                }
            })
        })
        it('shows duplicate count after a Notion import with skipped words', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement
            vi.mocked(window.api.sendImport).mockResolvedValue({
                status: 'success',
                data: { inserted: 0, skipped: 2, failed: 0, records: [] }
            })

            form.dispatchEvent(new Event('submit'))
            await Promise.resolve()
            await Promise.resolve()

            expect(document.getElementById('app-toast')?.textContent).toContain('2 duplicate(s)')
        })

        it('does not show an alert after a fully successful Notion import', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement
            vi.mocked(window.api.sendImport).mockResolvedValue({
                status: 'success',
                data: { inserted: 2, skipped: 0, failed: 0, records: [] }
            })

            form.dispatchEvent(new Event('submit'))
            await Promise.resolve()
            await Promise.resolve()

            expect(document.getElementById('app-toast')?.hidden).toBe(true)
        })

        it('shows error alert when sendImport throws error', async () => {
            const form = document.getElementById('form-import') as HTMLFormElement
            const fileInput = document.getElementById('source-file') as HTMLInputElement

            fileInput.value = '/path/to/file.txt'

            vi.mocked(window.api.sendImport).mockRejectedValue(new Error('Network error'))
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 10)
            await promise

            expect(consoleSpy).toHaveBeenCalled()
            expect(document.getElementById('app-toast')?.textContent).toContain(
                'An error occurred during import.'
            )
            consoleSpy.mockRestore()
        })
    })

    describe('Notion Sync Flow', () => {
        it('calls sendImport with NOTION_SYNC when form submitted', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement
            const deckInput = form.elements.namedItem('deck') as HTMLInputElement

            deckInput.value = 'NotionDeck'

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
                    deck: 'NotionDeck',
                    options: {
                        quiz: false,
                        flashcard: true
                    }
                }
            })
        })

        it('uses flashcard format without a format selection', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 0)
            await promise

            expect(window.api.sendImport).toHaveBeenCalledWith({
                type: 'NOTION_SYNC',
                payload: {
                    deck: '',
                    options: {
                        quiz: false,
                        flashcard: true
                    }
                }
            })
        })

        it('shows error alert when sendImport throws error', async () => {
            const form = document.getElementById('form-notion') as HTMLFormElement

            vi.mocked(window.api.sendImport).mockRejectedValue(new Error('Network error'))
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            form.dispatchEvent(new Event('submit'))

            const { promise, resolve: res } = Promise.withResolvers<void>()
            setTimeout(res, 10)
            await promise

            expect(consoleSpy).toHaveBeenCalled()
            expect(document.getElementById('app-toast')?.textContent).toContain(
                'An error occurred during sync.'
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

    describe('Add and Delete Actions', () => {
        it('adds a blank editable row in the import tab', () => {
            document.getElementById('btn-add-import-word')?.click()
            const row = document.querySelector<HTMLTableRowElement>(
                '#section-import tbody tr[data-id]'
            )
            expect(row?.querySelector('.word-cell')?.textContent).toBe('')
            expect(row?.querySelector('.word-cell')?.getAttribute('contenteditable')).toBe('true')
            expect(row?.querySelector<HTMLInputElement>('.row-select')).toBeTruthy()
        })

        it('creates and deletes selected collection words through the API', async () => {
            vi.mocked(window.api.createVocabulary).mockResolvedValue({ status: 'success' })
            document.getElementById('btn-add-collection-word')?.click()
            await Promise.resolve()
            expect(window.api.createVocabulary).toHaveBeenCalledWith({ word: '' })

            const body = document.querySelector('#section-collection tbody')
            body!.innerHTML =
                '<tr data-id="word-1"><td><input class="row-select" type="checkbox" /></td></tr>'
            body!.querySelector<HTMLInputElement>('.row-select')!.checked = true
            vi.mocked(window.api.deleteVocabulary).mockResolvedValue({
                status: 'success',
                data: { deleted: 1 }
            })
            document.getElementById('btn-delete-collection-selected')?.click()
            await Promise.resolve()
            expect(window.api.deleteVocabulary).toHaveBeenCalledWith({ recordIds: ['word-1'] })
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

describe('renderer security boundaries', () => {
    it('contains no inline event handlers or bootstrap scripts', () => {
        const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')

        expect(html).not.toMatch(/\son[a-z]+=/i)
        expect(html).not.toContain('<script>')
    })

    it('does not include a preload fallback assignment', () => {
        const preload = readFileSync(resolve(__dirname, '../../../preload/index.ts'), 'utf-8')

        expect(preload).not.toContain('window.api = api')
        expect(preload).not.toContain('else {')
    })
    it('does not invoke remote or browser speech services', () => {
        const renderer = readFileSync(resolve(__dirname, '../renderer.ts'), 'utf8')

        expect(renderer).not.toContain('speechSynthesis')
        expect(renderer).not.toContain('SpeechSynthesisUtterance')
        expect(renderer).not.toContain('new Audio(')
    })
})

describe('renderer CSP', () => {
    it('declares a strict self-hosted content security policy', () => {
        const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')

        expect(html).toContain('Content-Security-Policy')
        expect(html).toContain("default-src 'self'")
        expect(html).not.toContain('cdnjs.cloudflare.com')
        expect(html).not.toContain('fonts.googleapis.com')
    })
})
