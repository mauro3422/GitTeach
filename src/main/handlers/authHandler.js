// src/main/handlers/authHandler.js
// Handler: IPC bridge for authentication events.

import authService from '../services/authService.js';

/**
 * Registers all authentication-related IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
export function register(ipcMain) {
    ipcMain.handle('github:login', async () => {
        try {
            return await authService.login();
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.handle('github:check-auth', async () => {
        try {
            console.log('[Main] github:check-auth request received');
            return await authService.checkAuth();
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.on('github:logout', () => {
        console.log('[Main] Logout received');
        authService.logout();
    });

    console.log('[Handlers] ✅ authHandler registered.');
}

export default { register };
