// src/main/handlers/authHandler.js
import authService from '../services/authService.js';
import { IpcWrapper } from './IpcWrapper.js';

/**
 * Registers all authentication-related IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
export function register(ipcMain) {
    IpcWrapper.registerHandler(
        ipcMain,
        'github:login',
        () => authService.login(),
        'github:login'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'github:check-auth',
        () => authService.checkAuth(),
        'github:check-auth'
    );

    // Logout is fire-and-forget (On)
    ipcMain.on('github:logout', () => {
        console.log('[Main] Logout received');
        authService.logout();
    });

    console.log('[Handlers] ✅ authHandler registered with IpcWrapper.');
}

export default { register };
