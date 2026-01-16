/**
 * CacheRepository - Abstraction layer for cache operations
 * Abstracts calls to window.cacheAPI
 */
import { DebugLogger } from './debugLogger.js';

class CacheRepositoryService {
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
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getFileSummary(username, repo, path);
        } catch (e) {
            console.warn('[CacheRepository] Error getting file summary:', e);
            return null;
        }
    }

    /**
     * Saves file summary to cache
     */
    async setFileSummary(username, repo, path, sha, summary, contentSnippet) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setFileSummary(username, repo, path, sha, summary, contentSnippet);
            return true;
        } catch (e) {
            console.warn('[CacheRepository] Error setting file summary:', e);
            return false;
        }
    }

    /**
     * Checks if a file needs update
     */
    async needsUpdate(username, repo, path, currentSha) {
        if (!this.isAvailable()) return true;
        try {
            return await window.cacheAPI.needsUpdate(username, repo, path, currentSha);
        } catch (e) {
            return true; // Asumir que necesita update si hay error
        }
    }

    // ==========================================
    // REPOSITORY TREE
    // ==========================================

    /**
     * Checks if repo tree changed
     */
    async hasRepoChanged(username, repo, currentTreeSha) {
        if (!this.isAvailable()) return true;
        try {
            return await window.cacheAPI.hasRepoChanged(username, repo, currentTreeSha);
        } catch (e) {
            return true;
        }
    }

    /**
     * Saves repo tree SHA
     */
    async setRepoTreeSha(username, repo, treeSha) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setRepoTreeSha(username, repo, treeSha);
            return true;
        } catch (e) {
            console.warn('[CacheRepository] Error setting tree SHA:', e);
            return false;
        }
    }

    // ==========================================
    // TECHNICAL IDENTITY
    // ==========================================

    /**
     * Gets technical identity (deep synthesis) from cache
     */
    async getTechnicalIdentity(username) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getTechnicalIdentity(username);
        } catch (e) {
            console.warn('[CacheRepository] Error getting technical identity:', e);
            return null;
        }
    }

    /**
     * Saves technical identity (deep synthesis) to cache
     */
    async setTechnicalIdentity(username, identity) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setTechnicalIdentity(username, identity);
            return true;
        } catch (e) {
            console.warn('[CacheRepository] Error setting technical identity:', e);
            return false;
        }
    }

    /**
     * Gets technical findings (traceability map) from cache
     */
    async getTechnicalFindings(username) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getTechnicalFindings(username);
        } catch (e) {
            console.warn('[CacheRepository] Error getting technical findings:', e);
            return null;
        }
    }

    /**
     * Saves technical findings (traceability map) to cache
     */
    async setTechnicalFindings(username, findings) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setTechnicalFindings(username, findings);
            return true;
        } catch (e) {
            console.warn('[CacheRepository] Error setting technical findings:', e);
            return false;
        }
    }

    // ==========================================
    // COGNITIVE PROFILE (Master Memory)
    // ==========================================

    /**
     * Gets the CognitiveProfile (master user profile) from cache
     */
    async getCognitiveProfile(username) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getCognitiveProfile(username);
        } catch (e) {
            console.warn('[CacheRepository] Error getting CognitiveProfile:', e);
            return null;
        }
    }

    /**
     * Saves the CognitiveProfile (master user profile) to cache
     */
    async setCognitiveProfile(username, profile) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setCognitiveProfile(username, {
                ...profile,
                username,
                lastUpdated: new Date().toISOString()
            });
            console.log('[CacheRepository] Cognitive Profile updated:', profile.title);
            return true;
        } catch (e) {
            console.warn('[CacheRepository] Error setting CognitiveProfile:', e);
            return false;
        }
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
        if (!this.isAvailable()) return false;
        try {
            if (window.cacheAPI.appendRepoRawFinding) {
                await window.cacheAPI.appendRepoRawFinding(repoName, finding);
                return true;
            }
        } catch (e) { return false; }
        return false;
    }

    /**
     * Persists the curated memory nodes for a specific repo
     */
    async persistRepoCuratedMemory(repoName, nodes) {
        if (!this.isAvailable()) return false;
        try {
            if (window.cacheAPI.persistRepoCuratedMemory) {
                await window.cacheAPI.persistRepoCuratedMemory(repoName, nodes);
                return true;
            }
        } catch (e) { return false; }
        return false;
    }

    /**
     * Persists the consolidated blueprint for a specific repo
     */
    async persistRepoBlueprint(repoName, blueprint) {
        if (!this.isAvailable()) return false;
        try {
            if (window.cacheAPI.persistRepoBlueprint) {
                await window.cacheAPI.persistRepoBlueprint(repoName, blueprint);
                return true;
            }
        } catch (e) { return false; }
        return false;
    }

    /**
     * Gets all persisted repo blueprints for holistic analysis
     */
    async getAllRepoBlueprints() {
        if (!this.isAvailable()) return [];
        try {
            if (window.cacheAPI.getAllRepoBlueprints) {
                return await window.cacheAPI.getAllRepoBlueprints();
            }
        } catch (e) { return []; }
        return [];
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
            await this.setFileSummary(username, repo, path, sha, result.summary, result.content);
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
