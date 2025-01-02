import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    greet: () => 'Hello from Electron!',
});
