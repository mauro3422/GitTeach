// src/main/handlers/fleetHandler.js
import aiFleetService from '../services/aiFleetService.js';
import { IpcWrapper } from './IpcWrapper.js';

/**
 * Registers Fleet Monitoring IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
export function register(ipcMain) {
    IpcWrapper.registerHandler(
        ipcMain,
        'fleet:get-status',
        () => aiFleetService.getFleetState(),
        'fleet:get-status'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'fleet:refresh',
        () => aiFleetService.getFleetState(),
        'fleet:refresh'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'fleet:set-limits',
        (event, limits) => {
            aiFleetService.setLimits(limits);
            return { success: true };
        },
        'fleet:set-limits'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'fleet:verify',
        () => aiFleetService.verifyFleet(),
        'fleet:verify'
    );

    // Activity reporting (On)
    ipcMain.on('fleet:pipeline-activity', (event, data) => {
        aiFleetService.onPipelineActivity(data);
    });

    console.log('[Handlers] ✅ fleetHandler registered with IpcWrapper.');
}

export default { register };
