import profileService from '../services/profileService.js';
import { IpcWrapper } from './IpcWrapper.js';

/**
 * ProfileHandler - IPC bridge for user info and profile repository settings.
 */
class ProfileHandler {
    /**
     * Registers profile-related IPC handlers.
     * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
     */
    static register(ipcMain) {
        IpcWrapper.registerHandler(
            ipcMain,
            'github:get-user',
            () => profileService.getUserData(),
            'github:get-user'
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'github:get-profile-readme',
            (event, username) => profileService.getProfileReadme(username),
            'github:get-profile-readme'
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'github:update-profile-readme',
            (event, { username, content, sha }) => profileService.updateProfileReadme(username, content, sha),
            'github:update-profile-readme'
        );

        console.log('[Handlers] ✅ ProfileHandler registered with IpcWrapper.');
    }
}

export { ProfileHandler };
