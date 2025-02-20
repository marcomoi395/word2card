const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    ipcRenderer: {
        send: (channel, data) => ipcRenderer.send(channel, data),
        // Bạn có thể thêm các phương thức khác nếu cần
    },
});
