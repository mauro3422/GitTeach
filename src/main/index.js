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
import aiFleetService from './services/aiFleetService.js';

// --- IPC Handlers ---
import authHandler from './handlers/authHandler.js';
import { ProfileHandler } from './handlers/ProfileHandler.js';
import { RepoHandler } from './handlers/RepoHandler.js';
import { CommitHandler } from './handlers/CommitHandler.js';
import { SystemHandler } from './handlers/SystemHandler.js';
import cacheHandler from './handlers/cacheHandler.js';
import debugHandler from './handlers/debugHandler.js';
import fleetHandler from './handlers/fleetHandler.js';

// --- NOTE: LFM 2.5 model runs via llama-server.exe (llama.cpp) ---
// Endpoint: http://localhost:8000/v1/chat/completions

/**
 * Registers all IPC handlers from dedicated modules.
 */
function registerAllHandlers() {
    console.log('[Main] Registering domain handlers via IpcWrapper...');
    authHandler.register(ipcMain);
    ProfileHandler.register(ipcMain);
    RepoHandler.register(ipcMain);
    CommitHandler.register(ipcMain);
    SystemHandler.register(ipcMain);
    cacheHandler.register(ipcMain);
    debugHandler.register(ipcMain);
    fleetHandler.register(ipcMain);
    console.log('[Main] ✅ Domain architecture registered.');
}

/**
 * Creates the main application window.
 */
function createWindow() {
    const isTracer = process.argv.includes('--tracer');
    const startFile = isTracer ? '../renderer/tracer.html' : '../renderer/index.html';

    const win = new BrowserWindow({
        width: isTracer ? 1280 : 1000,
        height: isTracer ? 900 : 800,
        backgroundColor: '#0d1117',
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, startFile));

    // DEBUG: Only open DevTools in development
    if (process.env.NODE_ENV !== 'production' || isTracer) {
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

    // 4. Start AI Fleet Monitoring
    aiFleetService.start();

    // 5. Create the main window
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    aiMonitorService.stopMonitor();
    aiFleetService.stop();
    if (process.platform !== 'darwin') app.quit();
});
