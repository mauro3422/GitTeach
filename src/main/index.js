/**
 * GitTeach - AI-Powered GitHub Profile Generator
 * Copyright (C) 2026 Mauro (mauro3422)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * See LICENSE file for details.
 */

// src/main/index.js
// Entry Point: Clean orchestrator for the Electron main process.
// This file ONLY handles app lifecycle and delegates IPC/Services to dedicated modules.

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Services ---
import firewallService from './services/firewallService.js';
import aiMonitorService from './services/aiMonitorService.js';

// --- IPC Handlers ---
import authHandler from './handlers/authHandler.js';
import dataHandler from './handlers/dataHandler.js';
import cacheHandler from './handlers/cacheHandler.js';
import utilsHandler from './handlers/utilsHandler.js';
import debugHandler from './handlers/debugHandler.js';

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
