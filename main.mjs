import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import fetchAPI from './handlers/fetch.mjs';

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile('index.html');
    // win.webContents.openDevTools();
}

// Lắng nghe sự kiện từ renderer process
ipcMain.on('submit-data', async (event, data) => {
    const pathFile = path.join(app.getPath('userData'));
    // Đường dẫn đến thư mục "audio"
    const audioDir = path.join(pathFile, 'audio');

    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(audioDir)) {
        try {
            fs.mkdirSync(audioDir, { recursive: true }); // Tùy chọn 'recursive' tạo tất cả các thư mục con nếu cần
            console.log('Thư mục đã được tạo:', audioDir);
        } catch (err) {
            console.error('Lỗi khi tạo thư mục:', err.message);
        }
    } else {
        console.log('Thư mục đã tồn tại:', audioDir);
    }

    const result = await fetchAPI(data, pathFile);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
