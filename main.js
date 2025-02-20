const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fetchAPI = require('./handlers/fetch.js');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    win.loadFile('index.html');
    win.webContents.openDevTools();
}

ipcMain.handle('open-file-dialog', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
    });

    if (filePaths.length > 0) {
        const content = fs.readFileSync(filePaths[0], 'utf8');
        return { content, filePath: filePaths[0] };
    }
    return { content: null, filePath: null };
});

// Lắng nghe sự kiện từ renderer process
ipcMain.on('submit-data', async (event, data) => {
    const pathFile = path.join(app.getPath('userData'));
    const audioDir = path.join(pathFile, 'audio');

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

    try {
        const result = await fetchAPI(data, pathFile);

        console.log(result);
        return { content: 'success' };
    } catch (err) {
        return { content: err.message };
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === -1) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
