import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
    getFilePath: (file) => {
        return webUtils.getPathForFile(file)
    },
    sendImport: (importData) => {
        return ipcRenderer.invoke('send-import', importData)
    },
    saveSettings: (payload) => {
        return ipcRenderer.invoke('save-settings', payload)
    },
    getSecret: () => {
        return ipcRenderer.invoke('get-secret')
    }
}

if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI
    // @ts-ignore (define in dts)
    window.api = api
}
