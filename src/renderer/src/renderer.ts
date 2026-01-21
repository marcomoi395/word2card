import { FileImport, NotionSync } from '../../preload/index.d'

function init(): void {
    window.addEventListener('DOMContentLoaded', () => {
        dropFileGetPath()
        openFileDialog()
        formImport()
        formNotion()
        formSettings()
    })
}

function dropFileGetPath(): void {
    const dropZone = document.body

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.stopPropagation()
    })

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const files = e.dataTransfer?.files
        const sourceFile = document.getElementById('source-file') as HTMLInputElement
        const sectionImport = document.getElementById('section-import')

        if (files && files.length > 0 && sourceFile && sectionImport?.style.display !== 'none') {
            const file = files[0]
            const filePath = window.api.getFilePath(file)

            if (filePath) {
                sourceFile.hidden = false
                sourceFile.value = filePath
            }
        }
    })
}

function openFileDialog() {
    const sourceFileInput = document.getElementById('source-file') as HTMLInputElement
    if (sourceFileInput) {
        sourceFileInput.addEventListener('click', async () => {
            const result = await window.api.openFileDialog()

            if (result.filePath) {
                sourceFileInput.value = result.filePath
            }
        })
    }
}

function formImport() {
    const formImport = document.getElementById('form-import') as HTMLFormElement

    if (formImport) {
        formImport.addEventListener('submit', async (event) => {
            event.preventDefault()

            const sourceFileInput = document.getElementById('source-file') as HTMLInputElement
            const deckInput = document.getElementById('deck') as HTMLInputElement
            const chkQuiz = document.getElementById('chk-quiz-import') as HTMLInputElement
            const chkFlashcard = document.getElementById('chk-flashcard-import') as HTMLInputElement

            const sourceFile = sourceFileInput.value.trim()
            const deck = deckInput.value.trim()
            const isQuiz = chkQuiz.checked
            const isFlashcard = chkFlashcard.checked

            if (!sourceFile) {
                alert('Please provide a source file path.')
                sourceFileInput.focus()
                return
            }

            if (!isQuiz && !isFlashcard) {
                alert('Please select at least one import option (Quiz or Flashcard).')
                return
            }

            const importData: FileImport = {
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

            if (result?.status === 'success') {
                alert('Import successful!')
            } else {
                alert('Import failed: ' + result?.message)
            }
        })
    }
}

function formNotion() {
    const formNotion = document.getElementById('form-notion') as HTMLFormElement

    if (formNotion) {
        formNotion.addEventListener('submit', async (event) => {
            event.preventDefault()

            const notionTokenInput = document.getElementById('notion-token') as HTMLInputElement
            const deckInput = document.getElementById('deck') as HTMLInputElement
            const chkQuiz = document.getElementById('chk-quiz-notion') as HTMLInputElement
            const chkFlashcard = document.getElementById('chk-flashcard-notion') as HTMLInputElement

            const notionToken = notionTokenInput.value.trim()
            const deck = deckInput.value.trim()
            const isQuiz = chkQuiz.checked
            const isFlashcard = chkFlashcard.checked

            if (!notionToken) {
                alert('Please provide a Notion token.')
                notionTokenInput.focus()
                return
            }

            if (!isQuiz && !isFlashcard) {
                alert('Please select at least one import option (Quiz or Flashcard).')
                return
            }

            const notionData: NotionSync = {
                type: 'NOTION_SYNC',
                payload: {
                    token: notionToken,
                    deck,
                    options: {
                        quiz: isQuiz,
                        flashcard: isFlashcard
                    }
                }
            }

            const result = await window.api.sendImport(notionData)

            if (result?.status === 'success') {
                alert('Import successful!')
            } else {
                alert('Import failed: ' + result?.message)
            }
        })
    }
}

function formSettings() {
    const openaiInput = document.getElementById('openai-key-global') as HTMLInputElement
    const azureInput = document.getElementById('azure-key-global') as HTMLInputElement
    const unsplashInput = document.getElementById('unsplash-access-key-global') as HTMLInputElement
    const btnSave = document.getElementById('btn-save-settings') as HTMLButtonElement

    const loadSavedSettings = async () => {
        try {
            const savedData = await window.api.getSecret()

            if (savedData?.data) {
                if (savedData.data.openaiApiKey && openaiInput) {
                    openaiInput.value = savedData.data.openaiApiKey
                }
                if (savedData.data.azureApiKey && azureInput) {
                    azureInput.value = savedData.data.azureApiKey
                }
                if (savedData.data.unsplashAccessKey && unsplashInput) {
                    unsplashInput.value = savedData.data.unsplashAccessKey
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error)
        }
    }

    loadSavedSettings()

    if (btnSave) {
        btnSave.addEventListener('click', async (event) => {
            event.preventDefault()

            const openaiApiKey = openaiInput.value.trim()
            const azureApiKey = azureInput.value.trim()
            const unsplashAccessKey = unsplashInput.value.trim()

            const settingsData = {
                openaiApiKey,
                azureApiKey,
                unsplashAccessKey
            }

            try {
                const result = await window.api.saveSettings(settingsData)

                if (result.status === 'success') {
                    alert('Saved!!')
                } else {
                    alert('Failed to save settings: ' + result.message)
                }
            } catch (error) {
                console.error(error)
                alert('An error occurred while saving settings.')
            }
        })
    }
}

init()
