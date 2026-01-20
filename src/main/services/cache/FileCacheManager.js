import { LevelDBManager } from '../db/LevelDBManager.js';

/**
 * FileCacheManager - Logic for raw file contents and SHA validation (Global DB).
 */
class FileCacheManager {
    constructor(globalDb) {
        this.db = globalDb;
    }

    /**
     * Checks if a file needs to be updated based on SHA comparison.
     * @param {string} owner
     * @param {string} repo
     * @param {string} path
     * @param {string} sha
     * @returns {Promise<boolean>} true if update is needed
     */
    async needsUpdate(owner, repo, path, sha) {
        const key = `raw:file:${repo}:${path}`;
        const cached = await this.db.get(key);
        if (!cached) return true;
        return cached.meta?.sha !== sha;
    }

    /**
     * Sets file summary in the global cache.
     * @param {string} owner
     * @param {string} repo
     * @param {string} path
     * @param {string} sha
     * @param {string} summary
     * @param {string} content
     * @param {Object} fileMeta
     */
    async setFileSummary(owner, repo, path, sha, summary, content, fileMeta = {}) {
        const key = `raw:file:${repo}:${path}`;
        const data = {
            content,
            summary,
            meta: { sha, ...fileMeta },
            updatedAt: new Date().toISOString()
        };
        await this.db.put(key, data);
    }

    /**
     * Gets file summary from the global cache.
     * @param {string} owner
     * @param {string} repo
     * @param {string} path
     * @returns {Promise<Object|null>}
     */
    async getFileSummary(owner, repo, path) {
        const key = `raw:file:${repo}:${path}`;
        return await this.db.get(key);
    }

    /**
     * Sets repo tree SHA in the global cache.
     * @param {string} owner
     * @param {string} repo
     * @param {string} sha
     */
    async setRepoTreeSha(owner, repo, sha) {
        await this.db.put(`meta:repo:tree:${owner}:${repo}`, sha);
    }

    /**
     * Checks if repo has changed since last cached tree SHA.
     * @param {string} owner
     * @param {string} repo
     * @param {string} currentSha
     * @returns {Promise<boolean>} true if changed
     */
    async hasRepoChanged(owner, repo, currentSha) {
        const stored = await this.db.get(`meta:repo:tree:${owner}:${repo}`);
        return stored !== currentSha;
    }
}

export { FileCacheManager };
