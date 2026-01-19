// src/main/handlers/cacheHandler.js
// Handler: IPC bridge for cache-related events.

import cacheService from '../services/cacheService.js';

/**
 * Registers all cache-related IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
export function register(ipcMain) {
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

    ipcMain.handle('cache:get-technical-identity', async (event, username) => {
        try {
            return cacheService.getTechnicalIdentity(username);
        } catch (error) {
            return null;
        }
    });

    ipcMain.handle('cache:set-technical-identity', async (event, { username, identity }) => {
        cacheService.setTechnicalIdentity(username, identity);
        return { success: true };
    });

    ipcMain.handle('cache:get-technical-findings', async (event, username) => {
        try {
            return cacheService.getTechnicalFindings(username);
        } catch (error) {
            return null;
        }
    });

    ipcMain.handle('cache:set-technical-findings', async (event, { username, findings }) => {
        cacheService.setTechnicalFindings(username, findings);
        return { success: true };
    });

    // Cognitive Profile (Master Memory) handlers
    ipcMain.handle('cache:get-cognitive-profile', async (event, username) => {
        try {
            return cacheService.getCognitiveProfile(username);
        } catch (error) {
            console.error('[CacheHandler] Error getting CognitiveProfile:', error);
            return null;
        }
    });

    ipcMain.handle('cache:set-cognitive-profile', async (event, { username, profile }) => {
        try {
            cacheService.setCognitiveProfile(username, profile);
            return { success: true };
        } catch (error) {
            console.error('[CacheHandler] Error setting CognitiveProfile:', error);
            return { success: false, error: error.message };
        }
    });

    // Worker Audit Handlers (JSONL)
    ipcMain.handle('cache:append-worker-log', async (event, { workerId, finding }) => {
        cacheService.setWorkerAudit(workerId, finding);
        return { success: true };
    });

    ipcMain.handle('cache:get-worker-audit', async (event, workerId) => {
        return cacheService.getWorkerAudit(workerId);
    });

    // REPO-CENTRIC PERSISTENCE (V3)
    ipcMain.handle('cache:persist-repo-blueprint', async (event, { repoName, blueprint }) => {
        await cacheService.persistRepoBlueprint(repoName, blueprint);
        return { success: true };
    });

    ipcMain.handle('cache:get-all-repo-blueprints', async () => {
        return await cacheService.getAllRepoBlueprints();
    });

    ipcMain.handle('cache:append-repo-raw-finding', async (event, { repoName, finding }) => {
        await cacheService.appendRepoRawFinding(repoName, finding);
        return { success: true };
    });

    ipcMain.handle('cache:persist-repo-curated-memory', async (event, { repoName, nodes }) => {
        await cacheService.persistRepoCuratedMemory(repoName, nodes);
        return { success: true };
    });

    ipcMain.handle('cache:persist-repo-partitions', async (event, { repoName, partitions }) => {
        await cacheService.persistRepoPartitions(repoName, partitions);
        return { success: true };
    });

    // Golden Knowledge
    ipcMain.handle('cache:persist-repo-golden-knowledge', async (event, { repoName, data }) => {
        await cacheService.persistRepoGoldenKnowledge(repoName, data);
        return { success: true };
    });

    ipcMain.handle('cache:generate-summary', async (event, stats) => {
        return await cacheService.generateRunSummary(stats);
    });

    ipcMain.handle('cache:switch-session', async (event, sessionId) => {
        return await cacheService.switchSession(sessionId);
    });

    console.log('[Handlers] ✅ cacheHandler registered.');
}

export default { register };
