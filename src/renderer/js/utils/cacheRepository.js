/**
 * CacheRepository - Lightweight facade for cache operations
 * REFACTORED: Delegates to specialized modules (SRP compliant)
 *
 * SOLID Principles:
 * - S: Only orchestrates cache operations and coordinates modules
 * - O: Extensible via module composition
 * - L: N/A (no inheritance)
 * - I: Minimal interface for cache operations
 * - D: Depends on injected specialized modules
 *
 * Composed Modules:
 * - FileCacheManager: File summary caching
 * - RepoCacheManager: Repository blueprint caching
 * - IdentityCacheManager: Technical identity caching
 */
import { DebugLogger } from './debugLogger.js';
import { FileCacheManager } from '../services/cache/FileCacheManager.js';
import { RepoCacheManager } from '../services/cache/RepoCacheManager.js';
import { IdentityCacheManager } from '../services/cache/IdentityCacheManager.js';

class CacheRepositoryService {
    constructor() {
        // Compose specialized modules
        this.fileCache = new FileCacheManager();
        this.repoCache = new RepoCacheManager();
        this.identityCache = new IdentityCacheManager();
    }
    /**
     * Checks if cache is available
     */
    isAvailable() {
        return !!window.cacheAPI;
    }

    // ==========================================
    // FILE SUMMARIES
    // ==========================================

    /**
     * Gets file summary from cache
     * @returns {Promise<{summary: string, contentSnippet: string}|null>}
     */
    async getFileSummary(username, repo, path) {
        return this.fileCache.getFileSummary(username, repo, path);
    }

    /**
     * Saves file summary to cache
     */
    async setFileSummary(username, repo, path, sha, summary, contentSnippet, fileMeta = {}, durationMs = 0) {
        return this.fileCache.setFileSummary(username, repo, path, sha, summary, contentSnippet, fileMeta, durationMs);
    }

    /**
     * Checks if a file needs update
     */
    async needsUpdate(username, repo, path, currentSha) {
        return this.fileCache.needsUpdate(username, repo, path, currentSha);
    }

    // ==========================================
    // REPOSITORY TREE
    // ==========================================

    /**
     * Checks if repo tree changed
     */
    async hasRepoChanged(username, repo, currentTreeSha) {
        return this.repoCache.hasRepoChanged(username, repo, currentTreeSha);
    }

    /**
     * Saves repo tree SHA
     */
    async setRepoTreeSha(username, repo, treeSha) {
        return this.repoCache.setRepoTreeSha(username, repo, treeSha);
    }

    // ==========================================
    // TECHNICAL IDENTITY
    // ==========================================

    /**
     * Gets technical identity (deep synthesis) from cache
     */
    async getTechnicalIdentity(username) {
        return this.identityCache.getTechnicalIdentity(username);
    }

    /**
     * Saves technical identity (deep synthesis) to cache
     */
    async setTechnicalIdentity(username, identity) {
        return this.identityCache.setTechnicalIdentity(username, identity);
    }

    /**
     * Gets technical findings (traceability map) from cache
     */
    async getTechnicalFindings(username) {
        return this.identityCache.getTechnicalFindings(username);
    }

    /**
     * Saves technical findings (traceability map) to cache
     */
    async setTechnicalFindings(username, findings) {
        return this.identityCache.setTechnicalFindings(username, findings);
    }

    // ==========================================
    // COGNITIVE PROFILE (Master Memory)
    // ==========================================

    /**
     * Gets the CognitiveProfile (master user profile) from cache
     */
    async getCognitiveProfile(username) {
        return this.identityCache.getCognitiveProfile(username);
    }

    /**
     * Saves the CognitiveProfile (master user profile) to cache
     */
    async setCognitiveProfile(username, profile) {
        return this.identityCache.setCognitiveProfile(username, profile);
    }

    // ==========================================
    // WORKER AUDIT (Tracer Hub)
    // ==========================================

    /**
     * Appends a finding to a specific worker audit (JSONL)
     */
    async appendWorkerLog(workerId, logEntry) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.appendWorkerLog(workerId, logEntry);
            return true;
        } catch (e) {
            return false;
        }
    }

    // ==========================================
    // STATS
    // ==========================================

    /**
     * Gets cache statistics
     */
    async getStats() {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getStats();
        } catch (e) {
            return null;
        }
    }

    // ==========================================
    // REPO-CENTRIC PERSISTENCE (V3 Refactor)
    // ==========================================

    /**
     * Appends a raw finding to the repo's raw_findings.jsonl
     */
    async appendRepoRawFinding(repoName, finding) {
        return this.repoCache.appendRepoRawFinding(repoName, finding);
    }

    /**
     * Persists the curated memory nodes for a specific repo
     */
    async persistRepoCuratedMemory(repoName, nodes) {
        return this.repoCache.persistRepoCuratedMemory(repoName, nodes);
    }

    /**
     * Persists the consolidated blueprint for a specific repo
     */
    async persistRepoBlueprint(repoName, blueprint) {
        return this.repoCache.persistRepoBlueprint(repoName, blueprint);
    }

    /**
     * Gets all persisted repo blueprints for holistic analysis
     */
    async getAllRepoBlueprints() {
        return this.repoCache.getAllRepoBlueprints();
    }

    /**
     * Persists the semantic partitions for a specific repo
     */
    async persistRepoPartitions(repoName, partitions) {
        if (!this.isAvailable()) return false;
        // Delegate to window.cacheAPI if in Tracer, or implementation in RepoCache logic
        if (window.cacheAPI && window.cacheAPI.persistRepoPartitions) {
            return window.cacheAPI.persistRepoPartitions(repoName, partitions);
        }
        return true; // No-op for production if not using mock
    }

    // ==========================================
    // CONVENIENCE METHODS
    // ==========================================

    /**
     * Tries to get file from cache, saves after callback if not found
     * @param {Object} params - {username, repo, path, sha}
     * @param {Function} fetchFn - Async function to get content if not in cache
     * @returns {Promise<{summary: string, content: string, fromCache: boolean}>}
     */
    async getOrFetch(params, fetchFn) {
        const { username, repo, path, sha } = params;

        // Intentar obtener de cache
        const needsUpdate = await this.needsUpdate(username, repo, path, sha);
        if (!needsUpdate) {
            const cached = await this.getFileSummary(username, repo, path);
            if (cached) {
                return { ...cached, fromCache: true };
            }
        }

        // Fetch y guardar
        const result = await fetchFn();
        if (result && result.summary) {
            await this.setFileSummary(username, repo, path, sha, result.summary, result.content, result.file_meta || {}, result.durationMs || 0);
        }

        return { ...result, fromCache: false };
    }

    // ==========================================
    // DEBUG LOGGING
    // ==========================================

    /**
     * Snapshots current cache state for debug logging
     */
    async snapshotForDebug() {
        const stats = await this.getStats();
        DebugLogger.logMemory(stats, {
            timestamp: new Date().toISOString(),
            cacheAvailable: this.isAvailable()
        });
        return stats;
    }
}

// Singleton export
export const CacheRepository = new CacheRepositoryService();
