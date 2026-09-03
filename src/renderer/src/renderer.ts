import { createLogger } from '../../shared/logger'
import type {
    AppResponse,
    ImportDraftRecord,
    ImportRequest,
    NotionSyncRequest,
    ProviderHealthSnapshot,
    SaveSettingsPayload,
    VocabularyRecord
} from '../../shared/ipc'

const logger = createLogger('renderer')

type TabName = 'import' | 'collection' | 'notion' | 'settings'

let importDraftRecords: ImportDraftRecord[] = []
let collectionRecords: VocabularyRecord[] = []

function escapeHtml(value: string | null | undefined): string {
    return (value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function statusLabel(record: ImportDraftRecord | VocabularyRecord): string {
    if ('ankiStatus' in record && record.ankiStatus === 'submitted') {
        return 'Submitted'
    }
    if (record.generationStatus === 'ready') {
        return 'Ready'
    }
    if (record.generationStatus === 'failed') {
        return 'Generation failed'
    }
    return 'Needs data'
}

function recordRow(
    record: ImportDraftRecord | VocabularyRecord,
    editable: boolean,
    index: number
): string {
    const fields = ['partOfSpeech', 'cloze', 'vietnamese', 'ipa'] as const
    const values = fields.map((field) => escapeHtml(record[field]))
    const editableCells = values
        .map(
            (value, fieldIndex) =>
                `<td class="${editable ? 'editable-cell' : ''}" ${editable ? `contenteditable="true" data-field="${fields[fieldIndex]}" data-id="${record.id}"` : ''}>${value}</td>`
        )
        .join('')
    const wordCell = `<td class="word-cell ${editable ? 'editable-cell' : ''}" ${editable ? `contenteditable="true" data-field="word" data-id="${record.id}"` : ''}>${escapeHtml(record.word)}</td>`
    const image = record.imageUrl
        ? `<a class="image-link" href="${escapeHtml(record.imageUrl)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(record.imageUrl)}" alt="Preview for ${escapeHtml(record.word)}" /></a>`
        : '<span aria-label="No image">—</span>'
    return `<tr data-id="${record.id}"><td class="select-col"><input class="row-select" type="checkbox" aria-label="Select ${escapeHtml(record.word || 'new word')}" /></td><td class="index-col">${String(index + 1).padStart(2, '0')}</td>${wordCell}${editableCells}<td class="asset-cell">${image}</td><td class="asset-cell"><button class="audio-preview" type="button" data-audio-url="" data-word="${escapeHtml(record.word)}">Play</button></td><td><span class="status-pill ${record.generationStatus === 'ready' ? 'ready' : 'pending'}">${statusLabel(record)}</span></td></tr>`
}

function updateSelectAllState(table: HTMLTableElement): void {
    const selectAll = table.querySelector<HTMLInputElement>('thead .select-all')
    const rowCheckboxes = Array.from(table.querySelectorAll<HTMLInputElement>('tbody .row-select'))
    if (!selectAll) {
        return
    }

    const selectedCount = rowCheckboxes.filter((checkbox) => checkbox.checked).length
    selectAll.checked = rowCheckboxes.length > 0 && selectedCount === rowCheckboxes.length
    selectAll.indeterminate = selectedCount > 0 && selectedCount < rowCheckboxes.length
}

function initSelectionControls(): void {
    if (document.body.dataset.selectionControlsInitialized === 'true') {
        return
    }
    document.body.dataset.selectionControlsInitialized = 'true'

    document.addEventListener('change', (event) => {
        const checkbox = event.target
        if (!(checkbox instanceof HTMLInputElement) || !checkbox.classList.contains('row-select')) {
            return
        }

        const table = checkbox.closest('table')
        if (!(table instanceof HTMLTableElement)) {
            return
        }

        if (checkbox.classList.contains('select-all')) {
            table.querySelectorAll<HTMLInputElement>('tbody .row-select').forEach((rowCheckbox) => {
                rowCheckbox.checked = checkbox.checked
            })
        }

        updateSelectAllState(table)
    })
}

function renderRecords(): void {
    const previewBody = document.querySelector('#section-import .data-grid tbody')
    const collectionBody = document.querySelector('#section-collection .data-grid tbody')
    const empty = '<tr><td colspan="10" role="status">No words in this import yet.</td></tr>'
    if (previewBody) {
        previewBody.innerHTML = importDraftRecords.length
            ? importDraftRecords.map((record, i) => recordRow(record, true, i)).join('')
            : empty
    }
    if (collectionBody) {
        collectionBody.innerHTML = collectionRecords.length
            ? collectionRecords.map((record, i) => recordRow(record, true, i)).join('')
            : empty
    }
    document.querySelectorAll<HTMLTableElement>('.data-grid').forEach(updateSelectAllState)
    const counts = document.querySelectorAll<HTMLElement>('.table-count')
    if (counts[0]) {
        counts[0].textContent = `${importDraftRecords.length} words ready`
    }
    if (counts[1]) {
        counts[1].textContent = `${collectionRecords.length} words saved`
    }
    const stat = document.querySelector<HTMLElement>('.heading-stat strong')
    if (stat) {
        stat.textContent = String(importDraftRecords.length)
    }
    initAudioPreview()
}
async function loadCollection(): Promise<void> {
    const response = await window.api.listVocabulary()
    if (response.status !== 'success' || !response.data) {
        throw new Error(response.message || 'Failed to load collection')
    }
    collectionRecords = response.data
    renderRecords()
}
async function refreshVocabulary(): Promise<void> {
    await loadCollection()
}
function selectedRecordIds(selector: string): string[] {
    return Array.from(
        document.querySelectorAll<HTMLInputElement>(`${selector} tbody .row-select:checked`)
    )
        .map((checkbox) => checkbox.closest<HTMLTableRowElement>('tr')?.dataset.id)
        .filter((id): id is string => Boolean(id))
}

function draftRecord(word = ''): ImportDraftRecord {
    return {
        id: crypto.randomUUID(),
        word,
        source: 'file',
        sourceReference: null,
        partOfSpeech: null,
        cloze: null,
        example: null,
        vietnamese: null,
        ipa: null,
        meaning: null,
        imageUrl: null,
        imageProvider: null,
        audio: null,
        generationStatus: 'pending',
        generationError: null
    }
}

function initAddDeleteActions(): void {
    document.getElementById('btn-add-import-word')?.addEventListener('click', () => {
        importDraftRecords = [...importDraftRecords, draftRecord()]
        renderRecords()
    })
    document.getElementById('btn-delete-import-selected')?.addEventListener('click', () => {
        const selectedIds = new Set(
            Array.from(
                document.querySelectorAll<HTMLInputElement>(
                    '#section-import .data-grid tbody .row-select'
                )
            )
                .filter((checkbox) => checkbox.checked)
                .map((checkbox) => checkbox.closest('tr')?.dataset.id)
                .filter((id): id is string => Boolean(id))
        )
        if (!selectedIds.size) {
            return
        }
        importDraftRecords = importDraftRecords.filter((record) => !selectedIds.has(record.id))
        renderRecords()
    })
    document.getElementById('btn-add-collection-word')?.addEventListener('click', async () => {
        try {
            const response = await window.api.createVocabulary({ word: '' })
            showResponseAlert('Add word', response)
            if (response.status === 'success') {
                await refreshVocabulary()
            }
        } catch (error) {
            logger.error('vocabulary_create_failed', {
                error: error instanceof Error ? error : new Error(String(error))
            })
            alert('An error occurred while adding the word.')
        }
    })
    document
        .getElementById('btn-delete-collection-selected')
        ?.addEventListener('click', async () => {
            const recordIds = selectedRecordIds('#section-collection .data-grid')
            if (!recordIds.length) {
                return
            }
            try {
                const response = await window.api.deleteVocabulary({ recordIds })
                showResponseAlert('Delete selected', response)
                if (response.status === 'success') {
                    await refreshVocabulary()
                }
            } catch (error) {
                logger.error('vocabulary_delete_failed', {
                    error: error instanceof Error ? error : new Error(String(error))
                })
                alert('An error occurred while deleting words.')
            }
        })
}

function initVocabularyActions(): void {
    document.getElementById('btn-generate-data')?.addEventListener('click', async (event) => {
        const button = event.currentTarget as HTMLButtonElement
        setButtonLoading(button, true, 'Generating...')
        try {
            const response = await window.api.generateMissingData({ records: importDraftRecords })
            showResponseAlert('Generate data', response)
            if (response.status === 'success' && response.data?.records) {
                importDraftRecords = response.data.records
                renderRecords()
            }
        } catch (error) {
            logger.error('missing_data_generation_failed', {
                error: error instanceof Error ? error : new Error(String(error))
            })
            alert('An error occurred while generating data.')
        } finally {
            setButtonLoading(button, false)
        }
    })
    document.getElementById('btn-submit-anki')?.addEventListener('click', async (event) => {
        const button = event.currentTarget as HTMLButtonElement
        setButtonLoading(button, true, 'Submitting...')
        try {
            const response = await window.api.submitToAnki({ records: importDraftRecords })
            showResponseAlert('Submit to Anki', response)
            if (response.status === 'success') {
                importDraftRecords = []
                await refreshVocabulary()
                renderRecords()
            }
        } catch (error) {
            logger.error('anki_submission_failed', {
                error: error instanceof Error ? error : new Error(String(error))
            })
            alert('An error occurred while submitting to Anki.')
        } finally {
            setButtonLoading(button, false)
        }
    })
    document.addEventListener(
        'blur',
        async (event) => {
            const cell = event.target
            if (!(cell instanceof HTMLElement) || !cell.classList.contains('editable-cell')) {
                return
            }
            const id = cell.dataset.id
            const field = cell.dataset.field
            const value = cell.innerText.trim()
            const draft = importDraftRecords.find((item) => item.id === id)
            if (draft && field && field in draft) {
                ;(draft as unknown as Record<string, unknown>)[field] = value
                return
            }
            if (
                id &&
                field &&
                ['word', 'partOfSpeech', 'cloze', 'vietnamese', 'ipa'].includes(field)
            ) {
                const response = await window.api.updateVocabulary({
                    id,
                    changes: { [field]: value }
                })
                if (response.status === 'success') {
                    await refreshVocabulary()
                }
            }
        },
        true
    )
}

function renderHealth(snapshot: ProviderHealthSnapshot): void {
    const status = document.querySelector<HTMLElement>('.step-two-status')
    const list = status?.querySelector('.connection-list')
    if (!list) {
        return
    }
    const labels: Record<string, string> = {
        openai: 'AI',
        anki: 'AnkiConnect',
        notion: 'Notion',
        pexels: 'Pexels'
    }
    list.innerHTML = Object.entries(snapshot.providers)
        .map(
            ([key, value]) =>
                `<span class="connection-item" data-provider="${key}"><span class="status-dot ${value.state === 'connected' ? 'connected' : 'disconnected'}"></span>${labels[key] || key}: ${value.state}</span>`
        )
        .join('')
}

async function loadHealth(): Promise<void> {
    try {
        const response = await window.api.getProviderHealth()
        if (response.status === 'success' && response.data) {
            renderHealth(response.data)
        }
    } catch (error) {
        logger.error('provider_health_load_failed', {
            error:
                error instanceof Error ? error : new Error('Unknown provider health load failure')
        })
    }
}
async function refreshAnkiHealth(): Promise<void> {
    try {
        const response = await window.api.getAnkiHealth()
        const anki = response.status === 'success' ? response.data : undefined
        const item = document.querySelector<HTMLElement>('.connection-item[data-provider="anki"]')
        if (item && anki) {
            item.innerHTML = `<span class="status-dot ${anki.state === 'connected' ? 'connected' : 'disconnected'}"></span>AnkiConnect: ${anki.state}`
        }
    } catch (error) {
        logger.error('anki_health_load_failed', {
            error: error instanceof Error ? error : new Error('Unknown Anki health load failure')
        })
    }
}

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

function showResponseAlert(actionLabel: string, response: AppResponse<unknown> | undefined): void {
    // Only show alerts for errors; success feedback comes from button state
    if (response?.status !== 'success') {
        alert(`${actionLabel} failed: ${response?.message || 'Unknown error.'}`)
    }
}

function switchTab(tabName: TabName): void {
    const importSection = document.getElementById('section-import')
    const collectionSection = document.getElementById('section-collection')
    const notionSection = document.getElementById('section-notion')
    const settingsSection = document.getElementById('section-settings')

    ;[importSection, collectionSection, notionSection, settingsSection].forEach((section) => {
        section?.classList.remove('active-section')
    })

    if (tabName === 'import') {
        importSection?.classList.add('active-section')
    } else if (tabName === 'collection') {
        collectionSection?.classList.add('active-section')
    } else if (tabName === 'notion') {
        notionSection?.classList.add('active-section')
    } else {
        settingsSection?.classList.add('active-section')
    }

    const btnImport = document.getElementById('tab-import-btn')
    const btnCollection = document.getElementById('tab-collection-btn')
    const btnNotion = document.getElementById('tab-notion-btn')
    const btnSettings = document.getElementById('tab-settings-btn')
    const sourceFileBtn = document.getElementById('source-file-btn')
    const sourceNotionBtn = document.getElementById('tab-notion-btn')

    ;[btnImport, btnCollection, btnNotion, btnSettings, sourceFileBtn, sourceNotionBtn].forEach(
        (button) => {
            button?.classList.remove('active-btn')
        }
    )

    ;[sourceFileBtn, sourceNotionBtn].forEach((button) => {
        button?.classList.remove('active-source')
    })

    if (tabName === 'import') {
        btnImport?.classList.add('active-btn')
        sourceFileBtn?.classList.add('active-source')
    } else if (tabName === 'collection') {
        btnCollection?.classList.add('active-btn')
    } else if (tabName === 'notion') {
        btnNotion?.classList.add('active-btn')
        sourceNotionBtn?.classList.add('active-source')
    } else {
        btnSettings?.classList.add('active-btn')
    }

    const mascot = document.getElementById('bg-mascot')
    mascot?.classList.remove('bg-import', 'bg-notion', 'bg-settings')

    const pageEyebrow = document.querySelector<HTMLElement>('.page-heading .eyebrow')
    const pageTitle = document.querySelector<HTMLElement>('.page-heading h1')
    const pageCopy = document.querySelector<HTMLElement>('.page-heading .heading-copy')
    const pageStat = document.querySelector<HTMLElement>('.heading-stat strong')
    const pageStatLabel = document.querySelector<HTMLElement>('.heading-stat span:last-child')

    if (tabName === 'collection') {
        if (pageEyebrow) {
            pageEyebrow.textContent = 'WORD LIBRARY'
        }
        if (pageTitle) {
            pageTitle.textContent = 'Collection.'
        }
        if (pageCopy) {
            pageCopy.textContent = 'Browse and review the words collected from your sources.'
        }
        if (pageStat) {
            pageStat.textContent = '4'
        }
        if (pageStatLabel) {
            pageStatLabel.textContent = 'words saved'
        }
    } else if (tabName === 'import') {
        if (pageEyebrow) {
            pageEyebrow.textContent = 'IMPORT CENTER'
        }
        if (pageTitle) {
            pageTitle.textContent = 'Turn words into cards.'
        }
        if (pageCopy) {
            pageCopy.textContent =
                'Choose a source, set your destination, and review the vocabulary before creating your deck.'
        }
        if (pageStat) {
            pageStat.textContent = '0'
        }
        if (pageStatLabel) {
            pageStatLabel.textContent = 'words ready'
        }
    }

    if (tabName === 'import' || tabName === 'collection') {
        mascot?.classList.add('bg-import')
    } else if (tabName === 'notion') {
        mascot?.classList.add('bg-notion')
    } else {
        mascot?.classList.add('bg-settings')
    }
}

function selectImportSource(source: 'file' | 'notion'): void {
    const fileFields = document.getElementById('source-file-fields')
    const notionFields = document.getElementById('source-notion-fields')
    const fileButton = document.getElementById('source-file-btn')
    const notionButton = document.getElementById('tab-notion-btn')
    const notionSection = document.getElementById('section-notion')

    fileFields?.classList.toggle('source-fields-hidden', source !== 'file')
    notionFields?.classList.toggle('source-fields-hidden', source !== 'notion')
    fileButton?.classList.toggle('active-source', source === 'file')
    notionButton?.classList.toggle('active-source', source === 'notion')

    // Keep the legacy section state for existing navigation integrations.
    notionSection?.classList.toggle('active-section', source === 'notion')
}

function initWindowControls(): void {
    const minimizeBtn = document.getElementById('minimize-btn') as HTMLButtonElement | null
    const closeBtn = document.getElementById('close-btn') as HTMLButtonElement | null
    const settingsBtn = document.getElementById('tab-settings-btn') as HTMLButtonElement | null
    const importBtn = document.getElementById('tab-import-btn') as HTMLButtonElement | null
    const collectionBtn = document.getElementById('tab-collection-btn') as HTMLButtonElement | null
    const notionBtn = document.getElementById('tab-notion-btn') as HTMLButtonElement | null
    const sourceFileBtn = document.getElementById('source-file-btn') as HTMLButtonElement | null
    const notionSourceFileBtn = document.getElementById(
        'source-file-btn-notion'
    ) as HTMLButtonElement | null

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

    collectionBtn?.addEventListener('click', () => {
        switchTab('collection')
    })

    document.getElementById('btn-open-import')?.addEventListener('click', () => {
        switchTab('import')
    })

    notionBtn?.addEventListener('click', () => {
        selectImportSource('notion')
    })

    sourceFileBtn?.addEventListener('click', () => {
        selectImportSource('file')
    })

    notionSourceFileBtn?.addEventListener('click', () => {
        selectImportSource('file')
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

        const sourceFile = sourceFileInput?.value.trim() || ''
        const deck = deckInput?.value.trim() || ''

        if (!sourceFile) {
            alert('Please provide a source file path.')
            sourceFileInput?.focus()
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
                        quiz: false,
                        flashcard: true
                    }
                }
            }

            const result = await window.api.sendImport(importData)
            showResponseAlert('Import', result)
            if (result.status === 'success' && result.data?.records) {
                importDraftRecords = result.data.records
                renderRecords()
            }
        } catch (error) {
            logger.error('file_import_failed', {
                error: error instanceof Error ? error : new Error('Unknown file import failure')
            })
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

        const notionToken = notionTokenInput?.value.trim() || ''
        const notionDatabaseId = notionDatabaseIdInput?.value.trim() || ''
        const deck = deckInput?.value.trim() || ''

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

        setButtonLoading(submitButton, true, 'Syncing...')

        try {
            const notionData: NotionSyncRequest = {
                type: 'NOTION_SYNC',
                payload: {
                    token: notionToken,
                    notionDatabaseId,
                    deck,
                    options: {
                        quiz: false,
                        flashcard: true
                    }
                }
            }

            const result = await window.api.sendImport(notionData)
            showResponseAlert('Import', result)
            if (result.status === 'success' && result.data?.records) {
                importDraftRecords = result.data.records
                renderRecords()
            }
        } catch (error) {
            logger.error('notion_sync_failed', {
                error: error instanceof Error ? error : new Error('Unknown Notion sync failure')
            })
            alert('An error occurred during sync.')
        } finally {
            setButtonLoading(submitButton, false)
        }
    })
}

function initSettingsForm(): void {
    const openaiInput = document.getElementById('openai-key-global') as HTMLInputElement | null
    const openaiBaseUrlInput = document.getElementById('openai-base-url') as HTMLInputElement | null
    const openaiModelInput = document.getElementById('openai-model') as HTMLInputElement | null
    const azureInput = document.getElementById('azure-key-global') as HTMLInputElement | null
    const pexelsInput = document.getElementById('pexels-token-global') as HTMLInputElement | null
    const saveButton = document.getElementById('btn-save-settings') as HTMLButtonElement | null

    const loadSavedSettings = async () => {
        try {
            const savedData = await window.api.getSettingsStatus()
            if (savedData.status !== 'success' || !savedData.data) {
                return
            }

            const status = savedData.data.configured
            const openaiStatus = document.getElementById('openai-key-status')
            const azureStatus = document.getElementById('azure-key-status')
            const pexelsStatus = document.getElementById('pexels-token-status')
            if (openaiStatus) {
                openaiStatus.textContent = status.openaiApiKey ? 'Configured' : 'Not configured'
            }
            if (azureStatus) {
                azureStatus.textContent = status.azureApiKey ? 'Configured' : 'Not configured'
            }
            if (openaiBaseUrlInput && savedData.data.openaiBaseUrl) {
                openaiBaseUrlInput.value = savedData.data.openaiBaseUrl
            }
            if (openaiModelInput && savedData.data.openaiModel) {
                openaiModelInput.value = savedData.data.openaiModel
            }
            if (pexelsStatus) {
                pexelsStatus.textContent = status.pexelsToken ? 'Configured' : 'Not configured'
            }
        } catch (error) {
            logger.error('settings_load_failed', {
                error: error instanceof Error ? error : new Error('Unknown settings load failure')
            })
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
            pexelsToken: pexelsInput?.value.trim() || '',
            openaiBaseUrl: openaiBaseUrlInput?.value.trim() || '',
            openaiModel: openaiModelInput?.value.trim() || ''
            /* v8 ignore stop */
        }

        setButtonLoading(saveButton, true, 'Saving...')

        try {
            const result = await window.api.saveSettings(settingsData)
            // Only show alert on error; success feedback is provided by button state
            if (result.status !== 'success') {
                alert(`Failed to save settings: ${result.message}`)
            } else {
                await loadHealth()
            }
        } catch (error) {
            logger.error('settings_save_failed', {
                error: error instanceof Error ? error : new Error('Unknown settings save failure')
            })
            alert('An error occurred while saving settings.')
        } finally {
            setButtonLoading(saveButton, false)
        }
    })
}

function initAudioPreview(): void {
    document.querySelectorAll<HTMLButtonElement>('.audio-preview').forEach((button) => {
        button.addEventListener('click', () => {
            // Audio is intentionally unavailable; retain the button as a harmless placeholder.
            button.blur()
        })
    })
}

function init(): void {
    window.addEventListener('DOMContentLoaded', () => {
        void loadCollection().catch((error) => {
            logger.error('collection_load_failed', {
                error: error instanceof Error ? error : new Error(String(error))
            })
        })
        initWindowControls()
        initFileDrop()
        initFilePicker()
        initImportForm()
        initNotionForm()
        initSettingsForm()
        initAudioPreview()
        initVocabularyActions()
        initAddDeleteActions()
        initSelectionControls()
        void loadHealth()
        void refreshAnkiHealth()
        window.setInterval(() => void refreshAnkiHealth(), 10_000)
    })
}

init()
