// src/main/handlers/dataHandler.js
// Handler: IPC bridge for profile, repository, and commit data.

import profileService from '../services/profileService.js';
import repoService from '../services/repoService.js';

/**
 * Registers all data-related IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
export function register(ipcMain) {
    // --- Profile ---
    ipcMain.handle('github:get-user', async () => {
        try {
            return await profileService.getUserData();
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.handle('github:get-profile-readme', async (event, username) => {
        try {
            return await profileService.getProfileReadme(username);
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.handle('github:update-profile-readme', async (event, { username, content, sha }) => {
        try {
            return await profileService.updateProfileReadme(username, content, sha);
        } catch (error) {
            return { error: error.message };
        }
    });

    // --- Repositories ---
    ipcMain.handle('github:list-repos', async () => {
        try {
            return await repoService.listUserRepos();
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.handle('github:get-repo-readme', async (event, { owner, repo }) => {
        try {
            return await repoService.getRepoReadme(owner, repo);
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.handle('github:get-repo-tree', async (event, { owner, repo, recursive }) => {
        try {
            return await repoService.getRepoTree(owner, repo, recursive);
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.handle('github:create-profile-repo', async (event, username) => {
        try {
            return await repoService.createProfileRepo(username);
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.handle('github:create-workflow', async (event, { username, content }) => {
        try {
            return await repoService.createWorkflow(username, content);
        } catch (error) {
            return { error: error.message };
        }
    });

    // --- Commits (Fork Forensics) ---
    ipcMain.handle('github:get-user-commits', async (event, { owner, repo, author }) => {
        try {
            return await repoService.getUserCommits(owner, repo, author);
        } catch (error) {
            console.warn('[Main] getUserCommits error:', error.message);
            return { error: error.message, data: [] };
        }
    });

    ipcMain.handle('github:get-commit-diff', async (event, { owner, repo, sha }) => {
        try {
            return await repoService.getCommitDiff(owner, repo, sha);
        } catch (error) {
            return { error: error.message };
        }
    });

    // --- File Content ---
    ipcMain.handle('github:get-file-content', async (event, { owner, repo, path }) => {
        try {
            return await repoService.getFileContent(owner, repo, path);
        } catch (error) {
            return { error: error.message };
        }
    });

    console.log('[Handlers] ✅ dataHandler registered.');
}

export default { register };
