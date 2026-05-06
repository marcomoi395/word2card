export const IPC_CHANNELS = {
    windowMinimize: 'window-minimize',
    windowClose: 'window-close',
    openFileDialog: 'open-file-dialog',
    saveSettings: 'save-settings',
    getSecret: 'get-secret',
    sendImport: 'send-import'
} as const

export type SecretKey =
    | 'openaiApiKey'
    | 'azureApiKey'
    | 'pexelsToken'
    | 'notionToken'
    | 'notionDatabaseId'

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
    token: string
    notionDatabaseId: string
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

export interface SaveSettingsPayload {
    openaiApiKey: string
    azureApiKey: string
    pexelsToken: string
}

export interface SecretsData {
    openaiApiKey: string
    azureApiKey: string
    pexelsToken: string
    notionToken: string
    notionDatabaseId: string
}

export interface OpenFileDialogData {
    filePath: string | null
}

export type AppResponse<T = undefined> =
    | {
          status: 'success'
          data?: T
          message?: string
      }
    | {
          status: 'error'
          message: string
      }

export interface RendererApi {
    minimize: () => void
    close: () => void
    platform: NodeJS.Platform
    getFilePath: (file: File) => string
    openFileDialog: () => Promise<AppResponse<OpenFileDialogData>>
    sendImport: (importData: ImportRequest) => Promise<AppResponse>
    saveSettings: (payload: SaveSettingsPayload) => Promise<AppResponse>
    getSecret: () => Promise<AppResponse<SecretsData>>
}
