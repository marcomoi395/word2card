import { ElectronAPI } from '@electron-toolkit/preload'

export interface FileImport {
    type: 'FILE_IMPORT'
    payload: {
        filePath: string
        deck: string
        azureKey?: string
        options: {
            quiz: boolean
            flashcard: boolean
        }
    }
}

export interface NotionSync {
    type: 'NOTION_SYNC'
    payload: {
        token: string
        deck: string
        azureKey?: string
        options: {
            quiz: boolean
            flashcard: boolean
        }
    }
}

export interface DataResponse {
    status: string
    message?: string
    data?: {
        openaiApiKey: string
        azureApiKey: string
    }
}

declare global {
    interface Window {
        electron: ElectronAPI & {
            openFileDialog: () => Promise<{ filePath: string; canceled?: boolean }>
        }
        api: {
            getFilePath: (file: File) => string
            sendImport: (importData: FileImport | NotionSync) => Promise<DataResponse>
            saveSettings: (payload: object) => Promise<DataResponse>
            getSecret: () => Promise<DataResponse>
        }
    }
}
