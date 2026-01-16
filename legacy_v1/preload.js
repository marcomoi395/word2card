const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    ipcRenderer: {
        send: (channel, data) => ipcRenderer.send(channel, data),
    },
});
