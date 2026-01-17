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
                return await window.cacheAPI.getAllRepoBlueprints();
            }
        } catch (e) {
            return [];
        }
        return [];
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
        return {
            totalRepos: blueprints.length,
            totalComplexity: blueprints.reduce((sum, bp) => sum + (bp.metrics?.complexity || 0), 0),
            averageComplexity: blueprints.length > 0
                ? Math.round(blueprints.reduce((sum, bp) => sum + (bp.metrics?.complexity || 0), 0) / blueprints.length)
                : 0
        };
    }
}
