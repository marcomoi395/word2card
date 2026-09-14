export const IPC_CHANNELS = {
    windowMinimize: 'window-minimize',
    windowClose: 'window-close',
    openFileDialog: 'open-file-dialog',
    saveSettings: 'save-settings',
    getSettingsStatus: 'get-settings-status',
    sendImport: 'send-import',
    listVocabulary: 'list-vocabulary',
    createVocabulary: 'create-vocabulary',
    updateVocabulary: 'update-vocabulary',
    deleteVocabulary: 'delete-vocabulary',
    generateMissingData: 'generate-missing-data',
    getProviderHealth: 'get-provider-health',
    getAnkiHealth: 'get-anki-health',
    submitToAnki: 'submit-to-anki'
} as const

export type SecretKey =
    | 'openaiApiKey'
    | 'openaiBaseUrl'
    | 'openaiModel'
    | 'pexelsToken'
    | 'notionToken'
    | 'notionDatabaseId'

export type SourceType = 'file' | 'notion'
export type GenerationStatus = 'pending' | 'generating' | 'ready' | 'failed'
export type AnkiStatus = 'not_submitted' | 'submitted' | 'failed'

export interface VocabularyRecord {
    id: string
    word: string
    normalizedWord: string
    source: SourceType
    sourceReference: string | null
    deckName: string
    partOfSpeech: string | null
    cloze: string | null
    example: string | null
    vietnamese: string | null
    ipa: string | null
    meaning: string | null
    imageUrl: string | null
    imageProvider: string | null
    generationStatus: GenerationStatus
    generationError: string | null
    ankiStatus: AnkiStatus
    ankiError: string | null
    createdAt: string
    updatedAt: string
}

export type VocabularyEditableField =
    | 'word'
    | 'partOfSpeech'
    | 'cloze'
    | 'example'
    | 'vietnamese'
    | 'ipa'
    | 'meaning'
    | 'imageUrl'
    | 'imageProvider'
export type VocabularyEdit = Partial<Pick<VocabularyRecord, VocabularyEditableField>>

export interface CreateVocabularyPayload {
    word: string
}

export interface DeleteVocabularyPayload {
    recordIds: string[]
}

export interface DeleteVocabularySummary {
    deleted: number
}

export interface UpdateVocabularyPayload {
    id: string
    changes: VocabularyEdit
}

export type EditVocabularyPayload = UpdateVocabularyPayload

export interface ImportOptions {
    quiz: boolean
    flashcard: boolean
}

export interface FileImportPayload {
    filePath: string
    deck: string
    options: ImportOptions
}

export interface NotionSyncPayload {
    token?: string
    notionDatabaseId?: string
    deck: string
    options: ImportOptions
}

export interface FileImportRequest {
    type: 'FILE_IMPORT'
    payload: FileImportPayload
}

export interface NotionSyncRequest {
    type: 'NOTION_SYNC'
    payload: NotionSyncPayload
}

export type ImportRequest = FileImportRequest | NotionSyncRequest

export interface ImportDraftRecord {
    id: string
    word: string
    source: SourceType
    sourceReference: string | null
    deckName: string
    partOfSpeech: string | null
    cloze: string | null
    example: string | null
    vietnamese: string | null
    ipa: string | null
    meaning: string | null
    imageUrl: string | null
    imageProvider: string | null
    generationStatus: GenerationStatus
    generationError: string | null
}

export interface ImportSummary {
    inserted: number
    skipped: number
    failed: number
    records?: ImportDraftRecord[]
}

export interface GenerateMissingDataPayload {
    recordIds?: string[]
    records?: ImportDraftRecord[]
}

export interface GenerationSummary {
    processed: number
    succeeded: number
    failed: number
    records?: ImportDraftRecord[]
}

export interface SubmitToAnkiPayload {
    recordIds?: string[]
    records?: ImportDraftRecord[]
}

export interface SaveSettingsPayload {
    openaiApiKey: string
    pexelsToken: string
    notionToken?: string
    notionDatabaseId?: string
    openaiBaseUrl?: string
    openaiModel?: string
}

export interface MaskedSecretStatus {
    configured: boolean
    masked: string | null
}

export interface SettingsStatus {
    configured: Record<SecretKey, boolean>
    secrets?: Record<SecretKey, MaskedSecretStatus>
    openaiBaseUrl?: string
    openaiModel?: string
}

export type ProviderName = 'openai' | 'notion' | 'pexels' | 'anki'
export type ProviderHealthState =
    'checking' | 'connected' | 'not_configured' | 'invalid' | 'unreachable'

export interface ProviderHealthStatus {
    provider: ProviderName
    state: ProviderHealthState
    message?: string
}

export interface ProviderHealthSnapshot {
    providers: Record<ProviderName, ProviderHealthStatus>
}

export interface GenerateMissingDataPayload {
    recordIds?: string[]
}

export interface GenerationSummary {
    processed: number
    succeeded: number
    failed: number
}

export interface AnkiSubmissionSummary {
    processed: number
    submitted: number
    duplicates: number
    failed: number
}

export interface OpenFileDialogData {
    filePath: string | null
}

export type AppErrorCode =
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'NOT_CONFIGURED'
    | 'PROVIDER_UNAVAILABLE'
    | 'PERSISTENCE_ERROR'
    | 'INTERNAL_ERROR'

export type AppResponse<T = undefined> =
    | { status: 'success'; data?: T; message?: string }
    | { status: 'error'; code?: AppErrorCode; message: string }

export interface RendererApi {
    minimize: () => void
    close: () => void
    platform: NodeJS.Platform
    getFilePath: (file: File) => string
    openFileDialog: () => Promise<AppResponse<OpenFileDialogData>>
    sendImport: (importData: ImportRequest) => Promise<AppResponse<ImportSummary>>
    listVocabulary: () => Promise<AppResponse<VocabularyRecord[]>>
    createVocabulary: (payload: CreateVocabularyPayload) => Promise<AppResponse<VocabularyRecord>>
    updateVocabulary: (payload: UpdateVocabularyPayload) => Promise<AppResponse<VocabularyRecord>>
    deleteVocabulary: (
        payload: DeleteVocabularyPayload
    ) => Promise<AppResponse<DeleteVocabularySummary>>
    generateMissingData: (
        payload?: GenerateMissingDataPayload
    ) => Promise<AppResponse<GenerationSummary>>
    submitToAnki: (payload?: SubmitToAnkiPayload) => Promise<AppResponse<AnkiSubmissionSummary>>
    saveSettings: (payload: SaveSettingsPayload) => Promise<AppResponse>
    getSettingsStatus: () => Promise<AppResponse<SettingsStatus>>
    getProviderHealth: () => Promise<AppResponse<ProviderHealthSnapshot>>
    getAnkiHealth: () => Promise<AppResponse<ProviderHealthStatus>>
}
