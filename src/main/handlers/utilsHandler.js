// src/main/handlers/utilsHandler.js
// Handler: IPC bridge for utility events (images, AI, logging, dev tools).

const path = require('node:path');
const fs = require('fs');
const widgetBridgeService = require('../services/widgetBridgeService');
const aiMonitorService = require('../services/aiMonitorService');

/**
 * Registers all utility-related IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
function register(ipcMain) {
    // --- Widget Bridge ---
    ipcMain.handle('utils:get-image-base64', async (event, url) => {
        return await widgetBridgeService.getImageAsBase64(url);
    });

    // --- AI Health ---
    ipcMain.handle('utils:check-ai-health', async () => {
        return await aiMonitorService.performHealthCheck();
    });

    // --- Log Bridge: Renderer -> Terminal ---
    ipcMain.on('app:log', (event, msg) => {
        console.log(`[App Renderer] ${msg}`);
    });

    // --- Dev Tools Export ---
    ipcMain.on('dev:export-prompt', (event, prompt) => {
        console.log('[Dev] Export Prompt requested.');
        const filePath = path.join(__dirname, '../../../scripts/current_prompt.json');
        try {
            fs.writeFileSync(filePath, JSON.stringify({ systemPrompt: prompt }, null, 4));
            console.log('[Dev] Prompt exported to:', filePath);
        } catch (e) {
            console.error('[Dev] Error exporting prompt:', e);
        }
    });

    console.log('[Handlers] ✅ utilsHandler registered.');
}

module.exports = { register };
