import { createLogger } from '../../shared/logger'
import { defaultImportedDeckName } from '../../shared/deck'
import type {
    AppResponse,
    ImportDraftRecord,
    ImportRequest,
    NotionSyncRequest,
    ProviderHealthSnapshot,
    ProviderHealthStatus,
    SaveSettingsPayload,
    VocabularyRecord
} from '../../shared/ipc'

const logger = createLogger('renderer')

type TabName = 'import' | 'collection' | 'notion' | 'settings'

let importDraftRecords: ImportDraftRecord[] = []
let collectionRecords: VocabularyRecord[] = []
let activeTab: TabName = 'import'
let activeAudio: HTMLAudioElement | null = null
let toastTimer: number | undefined

function showToast(message: string): void {
    const toast = document.getElementById('app-toast')
    if (!toast) return
    toast.textContent = message
    toast.hidden = false
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
        toast.hidden = true
    }, 4200)
}

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
    const audio = record.audio
        ? `<button class="audio-play-btn" type="button" data-audio="${escapeHtml(record.audio)}" aria-label="Play pronunciation for ${escapeHtml(record.word)}">▶ Play</button>`
        : '<span aria-label="No audio">—</span>'
    return `<tr data-id="${record.id}"><td class="select-col"><input class="row-select" type="checkbox" aria-label="Select ${escapeHtml(record.word || 'new word')}" /></td><td class="index-col">${String(index + 1).padStart(2, '0')}</td>${wordCell}${editableCells}<td class="audio-cell">${audio}</td><td class="asset-cell">${image}</td><td><span class="status-pill ${record.generationStatus === 'ready' ? 'ready' : 'pending'}">${statusLabel(record)}</span></td></tr>`
}

function initAudioControls(): void {
    document.addEventListener('click', (event) => {
        const target = event.target
        if (!(target instanceof Element)) return
        const button = target.closest<HTMLButtonElement>('.audio-play-btn')
        const source = button?.dataset.audio
        if (!button || !source) return

        activeAudio?.pause()
        activeAudio = document.createElement('audio')
        activeAudio.src = source
        void activeAudio.play().catch(() => {
            showToast('Unable to play audio.')
        })
    })
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
    if (stat && activeTab === 'import') {
        stat.textContent = String(importDraftRecords.length)
    } else if (stat && activeTab === 'collection') {
        stat.textContent = String(collectionRecords.length)
    }
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
        deckName: defaultImportedDeckName(),
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
            showToast('An error occurred while adding the word.')
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
                showToast('An error occurred while deleting words.')
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
            showToast('An error occurred while generating data.')
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
            if (response.status === 'success' && response.data && response.data.failed === 0) {
                importDraftRecords = []
                await refreshVocabulary()
                renderRecords()
            }
        } catch (error) {
            logger.error('anki_submission_failed', {
                error: error instanceof Error ? error : new Error(String(error))
            })
            showToast('An error occurred while submitting to Anki.')
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
    renderAppStatus(snapshot)
    const status = document.querySelector<HTMLElement>('.step-two-status')
    const list = status?.querySelector('.connection-list')
    if (!list) {
        return
    }
    const labels: Record<string, string> = {
        openai: 'AI',
        anki: 'AnkiConnect',
        pexels: 'Pexels'
    }
    list.innerHTML = Object.entries(snapshot.providers)
        .filter(([key]) => key !== 'notion')
        .map(
            ([key, value]) =>
                `<span class="connection-item" data-provider="${key}"><span class="status-dot ${value.state === 'connected' ? 'connected' : 'disconnected'}"></span>${labels[key] || key}: ${value.state}</span>`
        )
        .join('')

    const notion = snapshot.providers.notion
    const notionDot = document.getElementById('notion-status-dot')
    const notionTitle = document.getElementById('notion-status-title')
    const notionNote = document.getElementById('notion-status-note')
    if (notion && notionDot && notionTitle && notionNote) {
        notionDot.classList.toggle('connected', notion.state === 'connected')
        notionDot.classList.toggle('disconnected', notion.state !== 'connected')
        notionTitle.textContent = `Notion ${providerHealthLabel(notion)}`
        notionNote.textContent = notion.message || providerHealthLabel(notion)
    }
}

function renderAppStatus(snapshot: ProviderHealthSnapshot): void {
    const status = document.getElementById('app-status')
    if (!status) return

    const requiredProviders = [snapshot.providers.openai, snapshot.providers.anki]
    if (requiredProviders.every((provider) => provider?.state === 'connected')) {
        status.textContent = 'Ready'
        return
    }

    if (requiredProviders.some((provider) => provider?.state === 'checking')) {
        status.textContent = 'Checking...'
        return
    }

    status.textContent = requiredProviders.some((provider) => provider?.state === 'not_configured')
        ? 'Setup required'
        : 'Unavailable'
}

async function loadAppVersion(): Promise<void> {
    try {
        const response = await window.api.getAppVersion()
        const version = document.getElementById('app-version')
        if (response.status === 'success' && response.data && version) {
            version.textContent = `v${response.data}`
        }
    } catch (error) {
        logger.error('app_version_load_failed', {
            error: error instanceof Error ? error : new Error(String(error))
        })
    }
}

function providerHealthLabel(status: ProviderHealthStatus): string {
    const labels: Record<ProviderHealthStatus['state'], string> = {
        checking: 'checking',
        connected: 'connected',
        not_configured: 'not configured',
        invalid: 'invalid',
        unreachable: 'unreachable'
    }
    return labels[status.state]
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
    if (response?.status === 'success') {
        const data = response.data
        if (
            data &&
            typeof data === 'object' &&
            'inserted' in data &&
            'skipped' in data &&
            'failed' in data
        ) {
            const summary = data as { inserted: number; skipped: number; failed: number }
            if (summary.skipped > 0 || summary.failed > 0) {
                showToast(
                    `${actionLabel}: ${summary.inserted} added, ${summary.skipped} duplicate(s), ${summary.failed} failed.`
                )
            }
            return
        }
        if (
            data &&
            typeof data === 'object' &&
            'submitted' in data &&
            'duplicates' in data &&
            'failed' in data
        ) {
            const summary = data as { submitted: number; duplicates: number; failed: number }
            const detail = response.message ? ` ${response.message}` : ''
            showToast(
                `${actionLabel}: ${summary.submitted} added, ${summary.duplicates} duplicate(s), ${summary.failed} failed.${detail}`
            )
        }
        return
    }
    showToast(`${actionLabel} failed: ${response?.message || 'Unknown error.'}`)
}

function switchTab(tabName: TabName): void {
    activeTab = tabName
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
            pageStat.textContent = String(collectionRecords.length)
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
            pageStat.textContent = String(importDraftRecords.length)
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

    const deckInput = getInputByName(form, 'deck')
    if (deckInput && !deckInput.value.trim()) {
        deckInput.value = defaultImportedDeckName()
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
            showToast('Please provide a source file path.')
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
            showToast('An error occurred during import.')
        } finally {
            setButtonLoading(submitButton, false)
        }
    })
}

function initNotionForm(): void {
    const form = document.getElementById('form-notion') as HTMLFormElement | null
    const sourceDeckInput = document.getElementById('notion-source-deck') as HTMLInputElement | null
    const sourceButton = document.getElementById(
        'btn-action-sync-source'
    ) as HTMLButtonElement | null

    const syncNotion = async (button: HTMLButtonElement | null, deck: string): Promise<void> => {
        if (button?.disabled) {
            return
        }

        setButtonLoading(button, true, 'Syncing...')

        try {
            const notionData: NotionSyncRequest = {
                type: 'NOTION_SYNC',
                payload: {
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
            showToast('An error occurred during sync.')
        } finally {
            setButtonLoading(button, false)
        }
    }

    const deckInput = form ? getInputByName(form, 'deck') : null
    for (const input of [deckInput, sourceDeckInput]) {
        if (input && !input.value.trim()) {
            input.value = defaultImportedDeckName()
        }
    }

    form?.addEventListener('submit', (event) => {
        event.preventDefault()
        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
        void syncNotion(submitButton, deckInput?.value.trim() || '')
    })

    sourceButton?.addEventListener('click', () => {
        void syncNotion(sourceButton, sourceDeckInput?.value.trim() || '')
    })
}

function initSettingsForm(): void {
    const openaiInput = document.getElementById('openai-key-global') as HTMLInputElement | null
    const openaiBaseUrlInput = document.getElementById('openai-base-url') as HTMLInputElement | null
    const openaiModelInput = document.getElementById('openai-model') as HTMLInputElement | null
    const azureInput = document.getElementById('azure-key-global') as HTMLInputElement | null
    const pexelsInput = document.getElementById('pexels-token-global') as HTMLInputElement | null
    const notionTokenInput = document.getElementById(
        'notion-token-global'
    ) as HTMLInputElement | null
    const notionDatabaseIdInput = document.getElementById(
        'notion-database-id-global'
    ) as HTMLInputElement | null
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
            const notionTokenStatus = document.getElementById('notion-token-status')
            const notionDatabaseIdStatus = document.getElementById('notion-database-id-status')
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
            if (notionTokenStatus) {
                notionTokenStatus.textContent = status.notionToken ? 'Configured' : 'Not configured'
            }
            if (notionDatabaseIdStatus) {
                notionDatabaseIdStatus.textContent = status.notionDatabaseId
                    ? 'Configured'
                    : 'Not configured'
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
            notionToken: notionTokenInput?.value.trim() || '',
            notionDatabaseId: notionDatabaseIdInput?.value.trim() || '',
            openaiBaseUrl: openaiBaseUrlInput?.value.trim() || '',
            openaiModel: openaiModelInput?.value.trim() || ''
            /* v8 ignore stop */
        }

        setButtonLoading(saveButton, true, 'Saving...')

        try {
            const result = await window.api.saveSettings(settingsData)
            // Only show alert on error; success feedback is provided by button state
            if (result.status !== 'success') {
                showToast(`Failed to save settings: ${result.message || 'Unknown error.'}`)
            } else {
                await loadSavedSettings()
                await loadHealth()
            }
        } catch (error) {
            logger.error('settings_save_failed', {
                error: error instanceof Error ? error : new Error('Unknown settings save failure')
            })
            showToast('An error occurred while saving settings.')
        } finally {
            setButtonLoading(saveButton, false)
        }
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
        initVocabularyActions()
        initAudioControls()
        initAddDeleteActions()
        initSelectionControls()
        document.getElementById('dialog-cancel')?.addEventListener('click', () => {
            document.getElementById('app-dialog')?.setAttribute('hidden', '')
        })
        document.querySelector('[data-dialog-dismiss="true"]')?.addEventListener('click', () => {
            document.getElementById('app-dialog')?.setAttribute('hidden', '')
        })
        void loadHealth()
        void loadAppVersion()
        void refreshAnkiHealth()
        window.setInterval(() => void refreshAnkiHealth(), 10_000)
    })
}

init()
