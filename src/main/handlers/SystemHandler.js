import path from 'node:path';
import fs from 'fs';
import { fileURLToPath } from 'node:url';
import widgetBridgeService from '../services/widgetBridgeService.js';
import aiMonitorService from '../services/aiMonitorService.js';
import { HealthChecker } from '../services/HealthChecker.js';
import { IpcWrapper } from './IpcWrapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SystemHandler - IPC bridge for AI health, logs, and developer tools.
 */
class SystemHandler {
    /**
     * Registers system-related IPC handlers.
     * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
     */
    static register(ipcMain) {
        IpcWrapper.registerHandler(
            ipcMain,
            'utils:get-image-base64',
            (event, url) => widgetBridgeService.getImageAsBase64(url),
            'utils:get-image-base64'
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'utils:check-ai-health',
            () => aiMonitorService.performHealthCheck(),
            'utils:check-ai-health'
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'utils:check-server-fleet',
            async (event, ports) => {
                const healthChecker = new HealthChecker();
                const results = {};
                for (const port of ports) {
                    try {
                        const portHealth = await healthChecker.testPortHealth(port);
                        results[port] = { online: portHealth.healthy, slots: portHealth.slots || 1 };
                    } catch (e) {
                        results[port] = { online: false };
                    }
                }
                return results;
            },
            'utils:check-server-fleet'
        );

        // Log bridge (Sync/On)
        ipcMain.on('app:log', (event, msg) => {
            console.log(`[App Renderer] ${msg}`);
        });

        // Dev Tools Export (Sync/On)
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

        console.log('[Handlers] ✅ SystemHandler registered with IpcWrapper.');
    }
}

export { SystemHandler };
