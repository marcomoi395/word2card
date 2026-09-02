import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
    AppResponse,
    GenerateMissingDataPayload,
    GenerationSummary,
    ImportRequest,
    ImportSummary,
    ProviderHealthSnapshot,
    RendererApi,
    SaveSettingsPayload,
    SettingsStatus,
    SubmitToAnkiPayload,
    AnkiSubmissionSummary,
    UpdateVocabularyPayload,
    VocabularyRecord
} from '../shared/ipc'
import { IPC_CHANNELS } from '../shared/ipc'

const api: RendererApi = {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.windowMinimize),
    close: () => ipcRenderer.send(IPC_CHANNELS.windowClose),
    platform: process.platform,
    getFilePath: (file: File) => webUtils.getPathForFile(file),
    openFileDialog: () => ipcRenderer.invoke(IPC_CHANNELS.openFileDialog),
    sendImport: (importData: ImportRequest): Promise<AppResponse<ImportSummary>> =>
        ipcRenderer.invoke(IPC_CHANNELS.sendImport, importData),
    listVocabulary: (): Promise<AppResponse<VocabularyRecord[]>> =>
        ipcRenderer.invoke(IPC_CHANNELS.listVocabulary),
    updateVocabulary: (payload: UpdateVocabularyPayload): Promise<AppResponse<VocabularyRecord>> =>
        ipcRenderer.invoke(IPC_CHANNELS.updateVocabulary, payload),
    generateMissingData: (
        payload?: GenerateMissingDataPayload
    ): Promise<AppResponse<GenerationSummary>> =>
        ipcRenderer.invoke(IPC_CHANNELS.generateMissingData, payload),
    submitToAnki: (payload?: SubmitToAnkiPayload): Promise<AppResponse<AnkiSubmissionSummary>> =>
        ipcRenderer.invoke(IPC_CHANNELS.submitToAnki, payload),
    saveSettings: (payload: SaveSettingsPayload) =>
        ipcRenderer.invoke(IPC_CHANNELS.saveSettings, payload),
    getSettingsStatus: (): Promise<AppResponse<SettingsStatus>> =>
        ipcRenderer.invoke(IPC_CHANNELS.getSettingsStatus),
    getProviderHealth: (): Promise<AppResponse<ProviderHealthSnapshot>> =>
        ipcRenderer.invoke(IPC_CHANNELS.getProviderHealth)
}

if (!process.contextIsolated) {
    throw new Error('Context isolation is required')
}

try {
    contextBridge.exposeInMainWorld('api', api)
} catch (error) {
    console.error(error)
}
