import { ElectronAPI } from '@electron-toolkit/preload'

export interface DataImport {
    type: string
    payload: {
        azureKey?: string
        options: {
            quiz: boolean
            flashcard: boolean
        }
    }
}

export interface FileImport extends DataImport {
    payload: {
        filePath: string
    }
}

export interface NotionSync extends DataImport {
    payload: {
        token: string
    }
}

export interface DataResponse {
    status: string
    message?: string
    data?: string | object
}

declare global {
    interface Window {
        electron: ElectronAPI & {
            openFileDialog: () => Promise<{ filePath: string; canceled?: boolean }>
        }
        api: {
            getFilePath: (file: File) => string
            sendImport: (importData: FileImport | NotionSync) => Promise<DataResponse>
        }
    }
}
