import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { DiskMirrorService } from './cache/DiskMirrorService.js';
import { SessionManagerService } from './cache/SessionManagerService.js';
import { SessionScopedCache } from './cache/SessionScopedCache.js';
import { LevelDBManager } from './db/LevelDBManager.js';
import { FileCacheManager } from './cache/FileCacheManager.js';
import AppLogger from './system/AppLogger.js';

/**
 * CacheService - Orchestrates persistence via LevelDB
 * High-performance Facade for all persistence operations
 */
class CacheService {
    constructor() {
        this.userDataPath = app.getPath('userData');
        this.globalDbPath = path.join(this.userDataPath, 'giteach-leveldb');

        // Always open Global DB for file cache
        this.globalDb = new LevelDBManager(this.globalDbPath);
        this.globalDb.open().catch(err => AppLogger.error('CacheService', 'Global DB Init Failed:', err));

        // Initialize managers
        this.fileCacheManager = new FileCacheManager(this.globalDb);

        // Initialize session management services
        this.sessionManagerService = new SessionManagerService();
        this.sessionScopedCache = new SessionScopedCache(this.sessionManagerService);

        // Disk mirroring
        this.mirrorPath = path.join(process.cwd(), 'logs', 'tracer_logs');
        this.diskMirrorService = new DiskMirrorService(this.mirrorPath);
    }

    /**
     * Helper to get the active DB for Results (Session if active, else Global)
     */
    get resultsDb() {
        const sessionDb = this.sessionManagerService.getSessionDb();
        return sessionDb || this.globalDb;
    }

    /**
     * Switches the active session for Results isolation
     */
    async switchSession(sessionId) {
        // Delegate to SessionManagerService
        await this.sessionManagerService.switchSession(sessionId);

        // Update disk mirror path based on session
        if (sessionId) {
            const sessionPath = this.sessionManagerService.getSessionPath();
            if (sessionPath) {
                this.diskMirrorService.setMirrorPath(sessionPath); // Redirect mirrors to session folder
            }
        } else {
            this.diskMirrorService.resetToBasePath(); // Reset to base path when no session
        }
    }

    /**
     * Helper to mirror data to readable JSON files
     */
    async mirrorToDisk(subfolder, filename, data, append = false) {
        try {
            await this.diskMirrorService.mirrorToDisk(subfolder, filename, data, append);
        } catch (e) {
            AppLogger.error('CacheService', 'Mirror failed:', e);
        }
    }

    // --- FILE CACHE (ALWAYS GLOBAL) ---

    async needsUpdate(owner, repo, path, sha) {
        return await this.fileCacheManager.needsUpdate(owner, repo, path, sha);
    }

    async setFileSummary(owner, repo, path, sha, summary, content, fileMeta = {}) {
        await this.fileCacheManager.setFileSummary(owner, repo, path, sha, summary, content, fileMeta);
    }

    async getFileSummary(owner, repo, path) {
        return await this.fileCacheManager.getFileSummary(owner, repo, path);
    }

    async setRepoTreeSha(owner, repo, sha) {
        await this.fileCacheManager.setRepoTreeSha(owner, repo, sha);
    }

    async hasRepoChanged(owner, repo, currentSha) {
        return await this.fileCacheManager.hasRepoChanged(owner, repo, currentSha);
    }

    // --- REPO CACHE / ANALYSIS RESULTS (SESSION SCOPED) ---

    async appendRepoRawFinding(repoName, finding) {
        await this.sessionScopedCache.appendRepoRawFinding(repoName, finding);
        await this.diskMirrorService.mirrorRepoRawFinding(repoName, finding);
    }

    async persistRepoCuratedMemory(repoName, nodes) {
        await this.sessionScopedCache.persistRepoCuratedMemory(repoName, nodes);
        await this.diskMirrorService.mirrorRepoCuratedMemory(repoName, nodes);
    }

    async persistRepoBlueprint(repoName, blueprint) {
        await this.sessionScopedCache.persistRepoBlueprint(repoName, blueprint);
        await this.diskMirrorService.mirrorRepoBlueprint(repoName, blueprint);
    }

    async getAllRepoBlueprints() {
        return await this.sessionScopedCache.getAllRepoBlueprints();
    }

    // --- INTELLIGENCE / IDENTITY (SESSION SCOPED) ---

    async setTechnicalIdentity(user, identity) {
        await this.sessionScopedCache.setTechnicalIdentity(user, identity);
    }

    async getTechnicalIdentity(user) {
        return await this.sessionScopedCache.getTechnicalIdentity(user);
    }

    async setTechnicalFindings(user, findings) {
        await this.sessionScopedCache.setTechnicalFindings(user, findings);
    }

    async getTechnicalFindings(user) {
        return await this.sessionScopedCache.getTechnicalFindings(user);
    }

    async setCognitiveProfile(user, profile) {
        await this.sessionScopedCache.setCognitiveProfile(user, profile);
    }

    async getCognitiveProfile(user) {
        return await this.sessionScopedCache.getCognitiveProfile(user);
    }

    // --- UTILS / LOGS ---

    async setWorkerAudit(id, finding) {
        await this.sessionScopedCache.setWorkerAudit(id, finding);
    }

    async getWorkerAudit(id) {
        return await this.sessionScopedCache.getWorkerAudit(id);
    }

    async persistRepoPartitions(repoName, partitions) {
        await this.sessionScopedCache.persistRepoPartitions(repoName, partitions);
    }

    async persistRepoGoldenKnowledge(repoName, data) {
        await this.sessionScopedCache.persistRepoGoldenKnowledge(repoName, data);
    }

    async getRepoGoldenKnowledge(repoName) {
        return await this.sessionScopedCache.getRepoGoldenKnowledge(repoName);
    }

    async generateRunSummary(stats) {
        const currentSessionId = this.sessionManagerService.getCurrentSessionId();
        return await this.diskMirrorService.generateRunSummary(stats, currentSessionId);
    }

    async getStats() {
        return {
            type: 'LevelDB',
            status: this.globalDb.status,
            sessionActive: this.sessionManagerService.isActiveSession(),
            currentSessionId: this.sessionManagerService.getCurrentSessionId()
        };
    }

    async clearCache() {
        AppLogger.warn('CacheService', 'LevelDB clear not fully implemented');
    }
}


export default new CacheService();
