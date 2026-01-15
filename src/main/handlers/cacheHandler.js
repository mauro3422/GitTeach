// src/main/handlers/cacheHandler.js
// Handler: IPC bridge for cache-related events.

const cacheService = require('../services/cacheService');

/**
 * Registers all cache-related IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
function register(ipcMain) {
    ipcMain.handle('cache:get-repo', async (event, { owner, repo }) => {
        try {
            return cacheService.getRepoCache(owner, repo);
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.handle('cache:set-repo', async (event, { owner, repo, data }) => {
        cacheService.setRepoCache(owner, repo, data);
        return { success: true };
    });

    ipcMain.handle('cache:needs-update', async (event, { owner, repo, filePath, sha }) => {
        try {
            return cacheService.needsUpdate(owner, repo, filePath, sha);
        } catch (error) {
            return true; // Assume needs update if error
        }
    });

    ipcMain.handle('cache:set-file-summary', async (event, { owner, repo, filePath, sha, summary, content }) => {
        cacheService.setFileSummary(owner, repo, filePath, sha, summary, content);
        return { success: true };
    });

    ipcMain.handle('cache:get-file-summary', async (event, { owner, repo, filePath }) => {
        try {
            return cacheService.getFileSummary(owner, repo, filePath);
        } catch (error) {
            return null;
        }
    });

    ipcMain.handle('cache:has-repo-changed', async (event, { owner, repo, treeSha }) => {
        try {
            return cacheService.hasRepoChanged(owner, repo, treeSha);
        } catch (error) {
            return true; // Assume changed if error
        }
    });

    ipcMain.handle('cache:set-repo-tree-sha', async (event, { owner, repo, treeSha }) => {
        cacheService.setRepoTreeSha(owner, repo, treeSha);
        return { success: true };
    });

    ipcMain.handle('cache:get-stats', async () => {
        try {
            return cacheService.getStats();
        } catch (error) {
            return { error: error.message };
        }
    });

    ipcMain.handle('cache:clear', async () => {
        cacheService.clearCache();
        return { success: true };
    });

    ipcMain.handle('cache:get-developer-dna', async (event, username) => {
        try {
            return cacheService.getDeveloperDNA(username);
        } catch (error) {
            return null;
        }
    });

    ipcMain.handle('cache:set-developer-dna', async (event, { username, dna }) => {
        cacheService.setDeveloperDNA(username, dna);
        return { success: true };
    });

    console.log('[Handlers] ✅ cacheHandler registered.');
}

module.exports = { register };
