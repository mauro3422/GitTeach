// src/main/handlers/cacheHandler.js
import cacheService from '../services/cacheService.js';
import { IpcWrapper } from './IpcWrapper.js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * Registers all cache-related IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
export function register(ipcMain) {
    // --- Basic Cache ---
    IpcWrapper.registerHandler(
        ipcMain,
        'cache:needs-update',
        (event, { owner, repo, filePath, sha }) => cacheService.needsUpdate(owner, repo, filePath, sha),
        'cache:needs-update',
        true, true // Default to true if error
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:set-file-summary',
        (event, { owner, repo, filePath, sha, summary, content }) => {
            cacheService.setFileSummary(owner, repo, filePath, sha, summary, content);
            return { success: true };
        },
        'cache:set-file-summary'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:get-file-summary',
        (event, { owner, repo, filePath }) => cacheService.getFileSummary(owner, repo, filePath),
        'cache:get-file-summary',
        true, null
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:has-repo-changed',
        (event, { owner, repo, treeSha }) => cacheService.hasRepoChanged(owner, repo, treeSha),
        'cache:has-repo-changed',
        true, true
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:set-repo-tree-sha',
        (event, { owner, repo, treeSha }) => {
            cacheService.setRepoTreeSha(owner, repo, treeSha);
            return { success: true };
        },
        'cache:set-repo-tree-sha'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:get-stats',
        () => cacheService.getStats(),
        'cache:get-stats'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:clear',
        () => {
            cacheService.clearCache();
            return { success: true };
        },
        'cache:clear'
    );

    // --- Intelligence / Identity ---
    IpcWrapper.registerHandler(
        ipcMain,
        'cache:get-technical-identity',
        (event, username) => cacheService.getTechnicalIdentity(username),
        'cache:get-technical-identity',
        true, null
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:set-technical-identity',
        (event, { username, identity }) => {
            cacheService.setTechnicalIdentity(username, identity);
            return { success: true };
        },
        'cache:set-technical-identity'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:get-technical-findings',
        (event, username) => cacheService.getTechnicalFindings(username),
        'cache:get-technical-findings',
        true, null
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:set-technical-findings',
        (event, { username, findings }) => {
            cacheService.setTechnicalFindings(username, findings);
            return { success: true };
        },
        'cache:set-technical-findings'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:get-cognitive-profile',
        (event, username) => cacheService.getCognitiveProfile(username),
        'cache:get-cognitive-profile',
        true, null
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:set-cognitive-profile',
        (event, { username, profile }) => {
            cacheService.setCognitiveProfile(username, profile);
            return { success: true };
        },
        'cache:set-cognitive-profile'
    );

    // --- Worker Audit ---
    IpcWrapper.registerHandler(
        ipcMain,
        'cache:append-worker-log',
        (event, { workerId, finding }) => {
            cacheService.setWorkerAudit(workerId, finding);
            return { success: true };
        },
        'cache:append-worker-log'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:get-worker-audit',
        (event, workerId) => cacheService.getWorkerAudit(workerId),
        'cache:get-worker-audit',
        true, []
    );

    // --- Repo-Centric Persistence (V3) ---
    IpcWrapper.registerHandler(
        ipcMain,
        'cache:persist-repo-blueprint',
        (event, { repoName, blueprint }) => cacheService.persistRepoBlueprint(repoName, blueprint),
        'cache:persist-repo-blueprint'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:get-all-repo-blueprints',
        () => cacheService.getAllRepoBlueprints(),
        'cache:get-all-repo-blueprints',
        true, []
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:append-repo-raw-finding',
        (event, { repoName, finding }) => cacheService.appendRepoRawFinding(repoName, finding),
        'cache:append-repo-raw-finding'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:persist-repo-curated-memory',
        (event, { repoName, nodes }) => cacheService.persistRepoCuratedMemory(repoName, nodes),
        'cache:persist-repo-curated-memory'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:persist-repo-partitions',
        (event, { repoName, partitions }) => cacheService.persistRepoPartitions(repoName, partitions),
        'cache:persist-repo-partitions'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:persist-repo-golden-knowledge',
        (event, { repoName, data }) => cacheService.persistRepoGoldenKnowledge(repoName, data),
        'cache:persist-repo-golden-knowledge'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:get-repo-golden-knowledge',
        (event, { owner, repo }) => cacheService.getRepoGoldenKnowledge(owner, repo),
        'cache:get-repo-golden-knowledge',
        true, null
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:generate-summary',
        (event, stats) => cacheService.generateRunSummary(stats),
        'cache:generate-summary'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'cache:switch-session',
        (event, sessionId) => cacheService.switchSession(sessionId),
        'cache:switch-session'
    );

    // --- Designer Blueprint Persistence (File-based for debugging) ---
    const getDesignerBlueprintPath = () => {
        // CHANGED: Use absolute path to guarantee file resolution regardless of CWD
        return 'c:\\Users\\mauro\\OneDrive\\Escritorio\\Giteach\\designer_blueprint.json';
    };

    IpcWrapper.registerHandler(
        ipcMain,
        'designer:save-blueprint',
        (event, blueprint) => {
            const filePath = getDesignerBlueprintPath();
            fs.writeFileSync(filePath, JSON.stringify(blueprint, null, 2), 'utf-8');
            console.log(`[Designer] Blueprint saved to: ${filePath}`);
            return { success: true, path: filePath };
        },
        'designer:save-blueprint'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'designer:load-blueprint',
        () => {
            const filePath = getDesignerBlueprintPath();
            if (!fs.existsSync(filePath)) return null;
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        },
        'designer:load-blueprint',
        true, null
    );



    console.log('[Handlers] ✅ cacheHandler registered with IpcWrapper.');
}

export default { register };
