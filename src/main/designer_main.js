import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cacheHandler from './handlers/cacheHandler.js';

// ESM dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 1000,
        backgroundColor: '#0d1117',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile(path.join(__dirname, '../renderer/routing_designer.html'));

    // Auto-open dev tools to see blueprint logs
    win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
    cacheHandler.register(ipcMain);
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
