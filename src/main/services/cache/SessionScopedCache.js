import AppLogger from '../system/AppLogger.js';

/**
 * SessionScopedCache - Handles all session-specific caching operations
 */
export class SessionScopedCache {
    constructor(sessionManagerService) {
        this.sessionManagerService = sessionManagerService;
    }

    /**
     * Checks if there's an active session and gets the cache manager
     */
    _getSessionCacheManager() {
        if (!this.sessionManagerService.getSessionCacheManager()) {
            throw new Error('No active session. Call switchSession() first.');
        }
        return this.sessionManagerService.getSessionCacheManager();
    }

    // --- REPO CACHE / ANALYSIS RESULTS (SESSION SCOPED) ---

    async appendRepoRawFinding(repoName, finding) {
        const cacheManager = this._getSessionCacheManager();
        await cacheManager.appendRepoRawFinding(repoName, finding);
    }

    async persistRepoCuratedMemory(repoName, nodes) {
        const cacheManager = this._getSessionCacheManager();
        await cacheManager.persistRepoCuratedMemory(repoName, nodes);
    }

    async persistRepoBlueprint(repoName, blueprint) {
        const cacheManager = this._getSessionCacheManager();
        await cacheManager.persistRepoBlueprint(repoName, blueprint);
    }

    async getAllRepoBlueprints() {
        const cacheManager = this._getSessionCacheManager();
        return await cacheManager.getAllRepoBlueprints();
    }

    // --- INTELLIGENCE / IDENTITY (SESSION SCOPED) ---

    async setTechnicalIdentity(user, identity) {
        const cacheManager = this._getSessionCacheManager();
        await cacheManager.setTechnicalIdentity(user, identity);
    }

    async getTechnicalIdentity(user) {
        const cacheManager = this._getSessionCacheManager();
        return await cacheManager.getTechnicalIdentity(user);
    }

    async setTechnicalFindings(user, findings) {
        const cacheManager = this._getSessionCacheManager();
        await cacheManager.setTechnicalFindings(user, findings);
    }

    async getTechnicalFindings(user) {
        const cacheManager = this._getSessionCacheManager();
        return await cacheManager.getTechnicalFindings(user);
    }

    async setCognitiveProfile(user, profile) {
        const cacheManager = this._getSessionCacheManager();
        await cacheManager.setCognitiveProfile(user, profile);
    }

    async getCognitiveProfile(user) {
        const cacheManager = this._getSessionCacheManager();
        return await cacheManager.getCognitiveProfile(user);
    }

    // --- UTILS / LOGS ---

    async setWorkerAudit(id, finding) {
        const cacheManager = this._getSessionCacheManager();
        await cacheManager.setWorkerAudit(id, finding);
    }

    async getWorkerAudit(id) {
        const cacheManager = this._getSessionCacheManager();
        return await cacheManager.getWorkerAudit(id);
    }

    async persistRepoPartitions(repoName, partitions) {
        const cacheManager = this._getSessionCacheManager();
        await cacheManager.persistRepoPartitions(repoName, partitions);
    }

    async persistRepoGoldenKnowledge(repoName, data) {
        const cacheManager = this._getSessionCacheManager();
        await cacheManager.persistRepoGoldenKnowledge(repoName, data);
    }

    async getRepoGoldenKnowledge(repoName) {
        const cacheManager = this._getSessionCacheManager();
        return await cacheManager.getRepoGoldenKnowledge(repoName);
    }
}