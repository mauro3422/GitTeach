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
        await aiFleetService.pollFleet();
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

    console.log('[Handlers] ✅ fleetHandler registered.');
}

export default { register };
