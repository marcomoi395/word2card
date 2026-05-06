import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { ImportRequest, RendererApi, SaveSettingsPayload } from '../shared/ipc'
import { IPC_CHANNELS } from '../shared/ipc'

const api: RendererApi = {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.windowMinimize),
    close: () => ipcRenderer.send(IPC_CHANNELS.windowClose),
    platform: process.platform,
    getFilePath: (file: File) => webUtils.getPathForFile(file),
    openFileDialog: () => ipcRenderer.invoke(IPC_CHANNELS.openFileDialog),
    sendImport: (importData: ImportRequest) =>
        ipcRenderer.invoke(IPC_CHANNELS.sendImport, importData),
    saveSettings: (payload: SaveSettingsPayload) =>
        ipcRenderer.invoke(IPC_CHANNELS.saveSettings, payload),
    getSecret: () => ipcRenderer.invoke(IPC_CHANNELS.getSecret)
}

if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    window.api = api
}
