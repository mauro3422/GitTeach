// src/main/index.js
// Entry Point: Clean orchestrator for the Electron main process.
// This file ONLY handles app lifecycle and delegates IPC/Services to dedicated modules.

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

// --- Services ---
const firewallService = require('./services/firewallService');
const aiMonitorService = require('./services/aiMonitorService');

// --- IPC Handlers ---
const authHandler = require('./handlers/authHandler');
const dataHandler = require('./handlers/dataHandler');
const cacheHandler = require('./handlers/cacheHandler');
const utilsHandler = require('./handlers/utilsHandler');
const debugHandler = require('./handlers/debugHandler');

// --- NOTE: LFM 2.5 model runs via llama-server.exe (llama.cpp) ---
// Endpoint: http://localhost:8000/v1/chat/completions

/**
 * Registers all IPC handlers from dedicated modules.
 */
function registerAllHandlers() {
    console.log('[Main] Registering IPC handlers...');
    authHandler.register(ipcMain);
    dataHandler.register(ipcMain);
    cacheHandler.register(ipcMain);
    utilsHandler.register(ipcMain);
    debugHandler.register(ipcMain);
    console.log('[Main] ✅ All handlers registered.');
}

/**
 * Creates the main application window.
 */
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        backgroundColor: '#0d1117',
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, '../renderer/index.html'));

    // DEBUG: Only open DevTools in development
    if (process.env.NODE_ENV !== 'production') {
        win.webContents.openDevTools({ mode: 'detach' });
    }
}

// --- APP LIFECYCLE ---

app.whenReady().then(() => {
    // 1. Initialize network interceptor (Firewall)
    firewallService.init();

    // 2. Register all IPC handlers
    registerAllHandlers();

    // 3. Start AI health monitor
    aiMonitorService.startMonitor();

    // 4. Create the main window
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    aiMonitorService.stopMonitor();
    if (process.platform !== 'darwin') app.quit();
});
