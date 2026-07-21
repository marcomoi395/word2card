import type {
    AppResponse,
    ImportRequest,
    NotionSyncRequest,
    SaveSettingsPayload
} from '../../shared/ipc'

type TabName = 'import' | 'notion' | 'settings'

function getInputByName(form: HTMLFormElement, name: string): HTMLInputElement | null {
    const field = form.elements.namedItem(name)
    return field instanceof HTMLInputElement ? field : null
}

function setButtonLoading(
    button: HTMLButtonElement | null,
    isLoading: boolean,
    loadingText = 'Processing...'
): void {
    /* v8 ignore start */
    if (!button) {
        return
    }
    /* v8 ignore stop */

    if (isLoading) {
        button.dataset.originalText = button.innerText
        button.innerText = loadingText
        button.disabled = true
        return
    }

    button.innerText = button.dataset.originalText || 'Submit'
    button.disabled = false
}

function showResponseAlert(actionLabel: string, response: AppResponse | undefined): void {
    if (response?.status === 'success') {
        alert(`${actionLabel} successful!`)
        return
    }

    /* v8 ignore start */
    alert(`${actionLabel} failed: ${response?.message || 'Unknown error.'}`)
}
    /* v8 ignore stop */

function switchTab(tabName: TabName): void {
    const importSection = document.getElementById('section-import')
    const notionSection = document.getElementById('section-notion')
    const settingsSection = document.getElementById('section-settings')

    ;[importSection, notionSection, settingsSection].forEach((section) => {
        section?.classList.remove('active-section')
    })

    if (tabName === 'import') {
        importSection?.classList.add('active-section')
    } else if (tabName === 'notion') {
        notionSection?.classList.add('active-section')
    } else {
        settingsSection?.classList.add('active-section')
    }

    const btnImport = document.getElementById('tab-import-btn')
    const btnNotion = document.getElementById('tab-notion-btn')
    const btnSettings = document.getElementById('tab-settings-btn')

    ;[btnImport, btnNotion, btnSettings].forEach((button) => {
        button?.classList.remove('active-btn')
    })

    if (tabName === 'import') {
        btnImport?.classList.add('active-btn')
    } else if (tabName === 'notion') {
        btnNotion?.classList.add('active-btn')
    } else {
        btnSettings?.classList.add('active-btn')
    }

    const mascot = document.getElementById('bg-mascot')
    mascot?.classList.remove('bg-import', 'bg-notion', 'bg-settings')

    if (tabName === 'import') {
        mascot?.classList.add('bg-import')
    } else if (tabName === 'notion') {
        mascot?.classList.add('bg-notion')
    } else {
        mascot?.classList.add('bg-settings')
    }
}

function initWindowControls(): void {
    const minimizeBtn = document.getElementById('minimize-btn') as HTMLButtonElement | null
    const closeBtn = document.getElementById('close-btn') as HTMLButtonElement | null
    const settingsBtn = document.getElementById('tab-settings-btn') as HTMLButtonElement | null
    const importBtn = document.getElementById('tab-import-btn') as HTMLButtonElement | null
    const notionBtn = document.getElementById('tab-notion-btn') as HTMLButtonElement | null

    minimizeBtn?.addEventListener('click', () => {
        window.api.minimize()
    })

    closeBtn?.addEventListener('click', () => {
        window.api.close()
    })

    settingsBtn?.addEventListener('click', () => {
        switchTab('settings')
    })

    importBtn?.addEventListener('click', () => {
        switchTab('import')
    })

    notionBtn?.addEventListener('click', () => {
        switchTab('notion')
    })

    if (window.api.platform === 'linux' && minimizeBtn) {
        minimizeBtn.style.display = 'none'
    }
}

function initFileDrop(): void {
    document.body.addEventListener('dragover', (event) => {
        event.preventDefault()
        event.stopPropagation()
    })

    document.body.addEventListener('drop', (event) => {
        event.preventDefault()
        event.stopPropagation()

        const files = event.dataTransfer?.files
        const sourceFileInput = document.getElementById('source-file') as HTMLInputElement | null
        const importSection = document.getElementById('section-import')

        if (
            files &&
            files.length > 0 &&
            sourceFileInput &&
            importSection?.classList.contains('active-section')
        ) {
            const filePath = window.api.getFilePath(files[0])
            if (filePath) {
                sourceFileInput.value = filePath
            }
        }
    })
}

function initFilePicker(): void {
    const sourceFileInput = document.getElementById('source-file') as HTMLInputElement | null
    sourceFileInput?.addEventListener('click', async () => {
        const result = await window.api.openFileDialog()
        if (result.status === 'success' && result.data?.filePath) {
            sourceFileInput.value = result.data.filePath
        }
    })
}

function initImportForm(): void {
    /* v8 ignore start */
    const form = document.getElementById('form-import') as HTMLFormElement | null
    if (!form) {
        return
    /* v8 ignore stop */
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault()

        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
        if (submitButton?.disabled) {
            return
        }

        const sourceFileInput = document.getElementById('source-file') as HTMLInputElement | null
        const deckInput = getInputByName(form, 'deck')
        const quizCheckbox = document.getElementById('chk-quiz-import') as HTMLInputElement | null
        const flashcardCheckbox = document.getElementById(
            'chk-flashcard-import'
        ) as HTMLInputElement | null

        const sourceFile = sourceFileInput?.value.trim() || ''
        const deck = deckInput?.value.trim() || ''
        const isQuiz = Boolean(quizCheckbox?.checked)
        const isFlashcard = Boolean(flashcardCheckbox?.checked)

        if (!sourceFile) {
            alert('Please provide a source file path.')
            sourceFileInput?.focus()
            return
        }

        if (!isQuiz && !isFlashcard) {
            alert('Please select at least one import option (Quiz or Flashcard).')
            return
        }

        setButtonLoading(submitButton, true, 'Importing...')

        try {
            const importData: ImportRequest = {
                type: 'FILE_IMPORT',
                payload: {
                    filePath: sourceFile,
                    deck,
                    options: {
                        quiz: isQuiz,
                        flashcard: isFlashcard
                    }
                }
            }

            const result = await window.api.sendImport(importData)
            showResponseAlert('Import', result)
        } catch (error) {
            console.error(error)
            alert('An error occurred during import.')
        } finally {
            setButtonLoading(submitButton, false)
        }
    })
}

function initNotionForm(): void {
    /* v8 ignore start */
    const form = document.getElementById('form-notion') as HTMLFormElement | null
    if (!form) {
        return
    /* v8 ignore stop */
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault()

        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
        if (submitButton?.disabled) {
            return
        }

        const notionTokenInput = document.getElementById('notion-token') as HTMLInputElement | null
        const notionDatabaseIdInput = document.getElementById(
            'notion-database-id'
        ) as HTMLInputElement | null
        const deckInput = getInputByName(form, 'deck')
        const quizCheckbox = document.getElementById('chk-quiz-notion') as HTMLInputElement | null
        const flashcardCheckbox = document.getElementById(
            'chk-flashcard-notion'
        ) as HTMLInputElement | null

        const notionToken = notionTokenInput?.value.trim() || ''
        const notionDatabaseId = notionDatabaseIdInput?.value.trim() || ''
        const deck = deckInput?.value.trim() || ''
        const isQuiz = Boolean(quizCheckbox?.checked)
        const isFlashcard = Boolean(flashcardCheckbox?.checked)

        if (!notionToken) {
            alert('Please provide a Notion token.')
            notionTokenInput?.focus()
            return
        }

        if (!notionDatabaseId) {
            alert('Please provide a Notion database ID.')
            notionDatabaseIdInput?.focus()
            return
        }

        if (!isQuiz && !isFlashcard) {
            alert('Please select at least one import option (Quiz or Flashcard).')
            return
        }

        setButtonLoading(submitButton, true, 'Syncing...')

        try {
            const notionData: NotionSyncRequest = {
                type: 'NOTION_SYNC',
                payload: {
                    token: notionToken,
                    notionDatabaseId,
                    deck,
                    options: {
                        quiz: isQuiz,
                        flashcard: isFlashcard
                    }
                }
            }

            const result = await window.api.sendImport(notionData)
            showResponseAlert('Import', result)
        } catch (error) {
            console.error(error)
            alert('An error occurred during sync.')
        } finally {
            setButtonLoading(submitButton, false)
        }
    })
}

function initSettingsForm(): void {
    const openaiInput = document.getElementById('openai-key-global') as HTMLInputElement | null
    const azureInput = document.getElementById('azure-key-global') as HTMLInputElement | null
    const pexelsInput = document.getElementById('pexels-token-global') as HTMLInputElement | null
    const notionTokenInput = document.getElementById('notion-token') as HTMLInputElement | null
    const notionDatabaseIdInput = document.getElementById(
        'notion-database-id'
    ) as HTMLInputElement | null
    const saveButton = document.getElementById('btn-save-settings') as HTMLButtonElement | null

    const loadSavedSettings = async () => {
        try {
            const savedData = await window.api.getSecret()
            if (savedData.status !== 'success' || !savedData.data) {
                return
            }

            if (openaiInput) {
                openaiInput.value = savedData.data.openaiApiKey
            }
            if (azureInput) {
                azureInput.value = savedData.data.azureApiKey
            }
            if (pexelsInput) {
                pexelsInput.value = savedData.data.pexelsToken
            }
            if (notionTokenInput) {
                notionTokenInput.value = savedData.data.notionToken
            }
            if (notionDatabaseIdInput) {
                notionDatabaseIdInput.value = savedData.data.notionDatabaseId
            }
        } catch (error) {
            console.error('Error loading settings:', error)
        }
    }

    void loadSavedSettings()

    saveButton?.addEventListener('click', async (event) => {
        event.preventDefault()

        if (saveButton.disabled) {
            return
        }

        const settingsData: SaveSettingsPayload = {
        /* v8 ignore start */
            openaiApiKey: openaiInput?.value.trim() || '',
            azureApiKey: azureInput?.value.trim() || '',
            pexelsToken: pexelsInput?.value.trim() || ''
        /* v8 ignore stop */
        }

        setButtonLoading(saveButton, true, 'Saving...')

        try {
            const result = await window.api.saveSettings(settingsData)
            if (result.status === 'success') {
        /* v8 ignore next */
                alert(result.message || 'Saved!')
            } else {
                alert(`Failed to save settings: ${result.message}`)
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred while saving settings.')
        } finally {
            setButtonLoading(saveButton, false)
        }
    })
}

function init(): void {
    window.addEventListener('DOMContentLoaded', () => {
        initWindowControls()
        initFileDrop()
        initFilePicker()
        initImportForm()
        initNotionForm()
        initSettingsForm()
        switchTab('import')
    })
}

init()
