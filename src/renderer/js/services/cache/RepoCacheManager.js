/**
 * RepoCacheManager - Handles repository-related caching operations
 * Extracted from CacheRepository to comply with SRP
 *
 * Responsibilities:
 * - Repository tree caching and change detection
 * - Repo blueprint persistence and retrieval
 * - Repository metadata management
 */
export class RepoCacheManager {
    /**
     * Checks if cache is available
     */
    isAvailable() {
        return !!window.cacheAPI;
    }

    /**
     * Checks if repo tree changed
     * @param {string} username - GitHub username
     * @param {string} repo - Repository name
     * @param {string} currentTreeSha - Current tree SHA
     * @returns {Promise<boolean>} True if changed
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
     * @param {string} username - GitHub username
     * @param {string} repo - Repository name
     * @param {string} treeSha - Tree SHA
     * @returns {Promise<boolean>} Success status
     */
    async setRepoTreeSha(username, repo, treeSha) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setRepoTreeSha(username, repo, treeSha);
            return true;
        } catch (e) {
            console.warn('[RepoCacheManager] Error setting tree SHA:', e);
            return false;
        }
    }

    /**
     * Persists the consolidated blueprint for a specific repo
     * @param {string} repoName - Repository name
     * @param {Object} blueprint - Repository blueprint
     * @returns {Promise<boolean>} Success status
     */
    async persistRepoBlueprint(repoName, blueprint) {
        if (!this.isAvailable()) return false;
        try {
            if (window.cacheAPI.persistRepoBlueprint) {
                await window.cacheAPI.persistRepoBlueprint(repoName, blueprint);
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    /**
     * Gets all persisted repo blueprints for holistic analysis
     * @returns {Promise<Array>} Array of repo blueprints
     */
    async getAllRepoBlueprints() {
        if (!this.isAvailable()) return [];
        try {
            if (window.cacheAPI.getAllRepoBlueprints) {
                const results = await window.cacheAPI.getAllRepoBlueprints();
                return Array.isArray(results) ? results : [];
            }
        } catch (e) {
            return [];
        }
        return [];
    }

    // ==========================================
    // FIX #2: INCREMENTAL METRICS PERSISTENCE
    // ==========================================

    /**
     * Gets current repo metrics (partial or complete)
     * @param {string} repoName - Repository name
     * @returns {Promise<Object|null>} Metrics object or null
     */
    async getRepoMetrics(repoName) {
        if (!this.isAvailable()) return null;
        try {
            if (window.cacheAPI.getRepoMetrics) {
                return await window.cacheAPI.getRepoMetrics(repoName);
            }
            // Fallback: Try to get from in-memory store
            if (!this._metricsStore) this._metricsStore = new Map();
            return this._metricsStore.get(repoName) || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Persists repo metrics (partial updates supported)
     * @param {string} repoName - Repository name
     * @param {Object} metrics - Metrics object to persist
     * @returns {Promise<boolean>} Success status
     */
    async persistRepoMetrics(repoName, metrics) {
        if (!this.isAvailable()) {
            // Fallback: Store in memory for testing
            if (!this._metricsStore) this._metricsStore = new Map();
            this._metricsStore.set(repoName, metrics);
            console.log(`[RepoCacheManager] Metrics stored in-memory for "${repoName}":`, metrics);
            return true;
        }
        try {
            if (window.cacheAPI.persistRepoMetrics) {
                await window.cacheAPI.persistRepoMetrics(repoName, metrics);
                return true;
            }
            // Fallback: Store in memory
            if (!this._metricsStore) this._metricsStore = new Map();
            this._metricsStore.set(repoName, metrics);
            return true;
        } catch (e) {
            console.error(`[RepoCacheManager] Failed to persist metrics: ${e.message}`);
            return false;
        }
    }

    /**
     * Gets all repo metrics for dashboard/widgets
     * @returns {Promise<Map>} Map of repoName -> metrics
     */
    async getAllRepoMetrics() {
        if (!this._metricsStore) this._metricsStore = new Map();

        // If cacheAPI has method, try to get from there
        if (this.isAvailable() && window.cacheAPI.getAllRepoMetrics) {
            try {
                const all = await window.cacheAPI.getAllRepoMetrics();
                return new Map(Object.entries(all || {}));
            } catch (e) {
                return this._metricsStore;
            }
        }
        return this._metricsStore;
    }

    /**
     * Appends a raw finding to the repo's raw_findings.jsonl
     * @param {string} repoName - Repository name
     * @param {Object} finding - Raw finding object
     * @returns {Promise<boolean>} Success status
     */
    async appendRepoRawFinding(repoName, finding) {
        if (!this.isAvailable()) return false;
        try {
            if (window.cacheAPI.appendRepoRawFinding) {
                await window.cacheAPI.appendRepoRawFinding(repoName, finding);
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    /**
     * Persists the curated memory nodes for a specific repo
     * @param {string} repoName - Repository name
     * @param {Array} nodes - Curated memory nodes
     * @returns {Promise<boolean>} Success status
     */
    async persistRepoCuratedMemory(repoName, nodes) {
        if (!this.isAvailable()) return false;
        try {
            if (window.cacheAPI.persistRepoCuratedMemory) {
                await window.cacheAPI.persistRepoCuratedMemory(repoName, nodes);
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    /**
     * Checks if repository has cached blueprint
     * @param {string} repoName - Repository name
     * @returns {Promise<boolean>} True if blueprint exists
     */
    async hasBlueprint(repoName) {
        const blueprints = await this.getAllRepoBlueprints();
        return blueprints.some(bp => bp.repoName === repoName);
    }

    /**
     * Gets blueprint for specific repository
     * @param {string} repoName - Repository name
     * @returns {Promise<Object|null>} Repository blueprint or null
     */
    async getRepoBlueprint(repoName) {
        const blueprints = await this.getAllRepoBlueprints();
        return blueprints.find(bp => bp.repoName === repoName) || null;
    }

    /**
     * Updates repository blueprint
     * @param {string} repoName - Repository name
     * @param {Object} updates - Blueprint updates
     * @returns {Promise<boolean>} Success status
     */
    async updateRepoBlueprint(repoName, updates) {
        const current = await this.getRepoBlueprint(repoName);
        if (!current) return false;

        const updated = { ...current, ...updates, lastUpdated: new Date().toISOString() };
        return await this.persistRepoBlueprint(repoName, updated);
    }

    /**
     * Gets repository cache statistics
     * @returns {Promise<Object>} Cache statistics for repos
     */
    async getRepoCacheStats() {
        const blueprints = await this.getAllRepoBlueprints();
        const metricsMap = await this.getAllRepoMetrics();

        const safeBlueprints = Array.isArray(blueprints) ? blueprints : [];

        return {
            totalRepos: safeBlueprints.length,
            totalComplexity: safeBlueprints.reduce((sum, bp) => sum + (bp.metrics?.complexity || 0), 0),
            averageComplexity: safeBlueprints.length > 0
                ? Math.round(safeBlueprints.reduce((sum, bp) => sum + (bp.metrics?.complexity || 0), 0) / safeBlueprints.length)
                : 0,
            avgModularity: safeBlueprints.length > 0
                ? safeBlueprints.reduce((sum, bp) => sum + (bp.metrics?.logic?.modularity || 0), 0) / safeBlueprints.length
                : 0
        };
    }
}
