/**
 * CacheRepository - Abstraction layer for cache operations
 * Abstracts calls to window.cacheAPI
 */

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
    // DEVELOPER DNA
    // ==========================================

    /**
     * Gets developer DNA from cache
     */
    async getDeveloperDNA(username) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getDeveloperDNA(username);
        } catch (e) {
            console.warn('[CacheRepository] Error getting developer DNA:', e);
            return null;
        }
    }

    /**
     * Saves developer DNA to cache
     */
    async setDeveloperDNA(username, dna) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setDeveloperDNA(username, dna);
            return true;
        } catch (e) {
            console.warn('[CacheRepository] Error setting developer DNA:', e);
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
}

// Singleton export
export const CacheRepository = new CacheRepositoryService();
