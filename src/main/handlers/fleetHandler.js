// src/main/handlers/fleetHandler.js
import aiFleetService from '../services/aiFleetService.js';

/**
 * Registers Fleet Monitoring IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
export function register(ipcMain) {
    // Current state snapshot
    ipcMain.handle('fleet:get-status', () => {
        return aiFleetService.getFleetState();
    });

    // Manual refresh trigger
    ipcMain.handle('fleet:refresh', async () => {
        return aiFleetService.getFleetState();
    });

    // Dynamic Limits update
    ipcMain.handle('fleet:set-limits', (event, limits) => {
        aiFleetService.setLimits(limits);
        return { success: true };
    });

    // Proactive Verification
    ipcMain.handle('fleet:verify', async () => {
        return await aiFleetService.verifyFleet();
    });

    // NUEVO: Agregar handler para eventos de actividad
    ipcMain.on('fleet:pipeline-activity', (event, data) => {
        aiFleetService.onPipelineActivity(data);
    });

    console.log('[Handlers] ✅ fleetHandler registered.');
}

export default { register };
