// src/main/handlers/utilsHandler.js
// Handler: IPC bridge for utility events (images, AI, logging, dev tools).

import path from 'node:path';
import fs from 'fs';
import { fileURLToPath } from 'node:url';
import widgetBridgeService from '../services/widgetBridgeService.js';
import aiMonitorService from '../services/aiMonitorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Registers all utility-related IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
export function register(ipcMain) {
    // --- Widget Bridge ---
    ipcMain.handle('utils:get-image-base64', async (event, url) => {
        return await widgetBridgeService.getImageAsBase64(url);
    });

    // --- AI Health ---
    ipcMain.handle('utils:check-ai-health', async () => {
        return await aiMonitorService.performHealthCheck();
    });

    ipcMain.handle('utils:check-server-fleet', async (event, ports) => {
        const results = {};
        console.log(`[Main] IPC utils:check-server-fleet called for ports:`, ports);
        for (const port of ports) {
            try {
                const url = `http://127.0.0.1:${port}/props`;
                console.log(`[Main] Fetching status for port ${port}: ${url}`);
                const res = await fetch(url, {
                    method: 'GET',
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log(`[Main] Port ${port} ONLINE. Keys:`, Object.keys(data).join(', '));

                    // Try to extract capacity/slots from various common paths in llama.cpp
                    let slots = 1;
                    if (data.total_slots !== undefined && data.total_slots !== null) {
                        slots = parseInt(data.total_slots);
                        console.log(`[Main] Port ${port}: Found total_slots = ${slots}`);
                    } else if (Array.isArray(data)) {
                        slots = data.length; // Likely /slots endpoint
                        console.log(`[Main] Port ${port}: Found Array length = ${slots}`);
                    } else if (data.slots) {
                        slots = Array.isArray(data.slots) ? data.slots.length : data.slots;
                        console.log(`[Main] Port ${port}: Found data.slots = ${slots}`);
                    } else if (data.default_generation_settings?.params?.n_parallel) {
                        slots = data.default_generation_settings.params.n_parallel;
                        console.log(`[Main] Port ${port}: Found n_parallel = ${slots}`);
                    } else if (data.params?.n_slots) {
                        slots = data.params.n_slots;
                        console.log(`[Main] Port ${port}: Found n_slots = ${slots}`);
                    } else {
                        console.log(`[Main] Port ${port}: No slot info found, defaulting to 1. Data snippet:`, JSON.stringify(data).substring(0, 200));
                    }

                    results[port] = {
                        online: true,
                        slots: slots
                    };
                } else {
                    console.warn(`[Main] Port ${port} returned status ${res.status}`);
                    results[port] = { online: false };
                }
            } catch (e) {
                console.error(`[Main] Port ${port} fetch error: ${e.message}`);
                results[port] = { online: false };
            }
        }
        return results;
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

export default { register };
