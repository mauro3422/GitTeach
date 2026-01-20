import repoService from '../services/repoService.js';
import { IpcWrapper } from './IpcWrapper.js';

/**
 * CommitHandler - IPC bridge for commit forensics and diffs.
 */
class CommitHandler {
    /**
     * Registers commit-related IPC handlers.
     * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
     */
    static register(ipcMain) {
        IpcWrapper.registerHandler(
            ipcMain,
            'github:get-user-commits',
            (event, { owner, repo, author }) => repoService.getUserCommits(owner, repo, author),
            'github:get-user-commits',
            true, // Use default on error
            []    // Default data is empty array
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'github:get-commit-diff',
            (event, { owner, repo, sha }) => repoService.getCommitDiff(owner, repo, sha),
            'github:get-commit-diff'
        );

        console.log('[Handlers] ✅ CommitHandler registered with IpcWrapper.');
    }
}

export { CommitHandler };
