import { FileImport, NotionSync } from '../../preload/index.d'

function init(): void {
    window.addEventListener('DOMContentLoaded', () => {
        dropFileGetPath()
        formImport()
        formNotion()
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

function formImport() {
    const formImport = document.getElementById('form-import') as HTMLFormElement

    if (formImport) {
        formImport.addEventListener('submit', async (event) => {
            event.preventDefault()

            const sourceFileInput = document.getElementById('source-file') as HTMLInputElement
            const deckInput = document.getElementById('deck') as HTMLInputElement
            const azureKeyInput = document.getElementById('azure-key-import') as HTMLInputElement
            const chkQuiz = document.getElementById('chk-quiz-import') as HTMLInputElement
            const chkFlashcard = document.getElementById('chk-flashcard-import') as HTMLInputElement

            const sourceFile = sourceFileInput.value.trim()
            const deck = deckInput.value.trim()
            const azureKey = azureKeyInput.value.trim()
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
                    azureKey: azureKey,
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
            const azureKeyInput = document.getElementById('azure-key-notion') as HTMLInputElement
            const chkQuiz = document.getElementById('chk-quiz-notion') as HTMLInputElement
            const chkFlashcard = document.getElementById('chk-flashcard-notion') as HTMLInputElement

            const notionToken = notionTokenInput.value.trim()
            const deck = deckInput.value.trim()
            const azureKey = azureKeyInput.value.trim()
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
                    azureKey: azureKey,
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

init()
