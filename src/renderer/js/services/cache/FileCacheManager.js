/**
 * FileCacheManager - Handles file summary caching operations
 * Extracted from CacheRepository to comply with SRP
 *
 * Responsibilities:
 * - File summary storage and retrieval
 * - Cache validation and update checking
 * - File metadata management
 */
import { DebugLogger } from '../../utils/debugLogger.js';

export class FileCacheManager {
    /**
     * Checks if cache is available
     */
    isAvailable() {
        return !!window.cacheAPI;
    }

    /**
     * Gets file summary from cache
     * @param {string} username - GitHub username
     * @param {string} repo - Repository name
     * @param {string} path - File path
     * @returns {Promise<{summary: string, contentSnippet: string}|null>}
     */
    async getFileSummary(username, repo, path) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getFileSummary(username, repo, path);
        } catch (e) {
            console.warn('[FileCacheManager] Error getting file summary:', e);
            return null;
        }
    }

    /**
     * Saves file summary to cache
     * @param {string} username - GitHub username
     * @param {string} repo - Repository name
     * @param {string} path - File path
     * @param {string} sha - File SHA
     * @param {string} summary - File summary
     * @param {string} contentSnippet - Content snippet
     * @param {Object} fileMeta - File metadata
     * @returns {Promise<boolean>} Success status
     */
    async setFileSummary(username, repo, path, sha, summary, contentSnippet, fileMeta = {}, durationMs = 0) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setFileSummary(username, repo, path, sha, summary, contentSnippet, fileMeta, durationMs);
            return true;
        } catch (e) {
            console.warn('[FileCacheManager] Error setting file summary:', e);
            return false;
        }
    }

    /**
     * Checks if a file needs update based on SHA
     * @param {string} username - GitHub username
     * @param {string} repo - Repository name
     * @param {string} path - File path
     * @param {string} currentSha - Current file SHA
     * @returns {Promise<boolean>} True if update needed
     */
    async needsUpdate(username, repo, path, currentSha) {
        if (!this.isAvailable()) return true;
        try {
            return await window.cacheAPI.needsUpdate(username, repo, path, currentSha);
        } catch (e) {
            return true; // Assume needs update if error
        }
    }

    /**
     * Tries to get file from cache, saves after callback if not found
     * @param {Object} params - {username, repo, path, sha}
     * @param {Function} fetchFn - Async function to get content if not in cache
     * @returns {Promise<{summary: string, content: string, fromCache: boolean}>}
     */
    async getOrFetch(params, fetchFn) {
        const { username, repo, path, sha } = params;

        // Try to get from cache
        const needsUpdate = await this.needsUpdate(username, repo, path, sha);
        if (!needsUpdate) {
            const cached = await this.getFileSummary(username, repo, path);
            if (cached) {
                return { ...cached, fromCache: true };
            }
        }

        // Fetch and save
        const result = await fetchFn();
        if (result && result.summary) {
            await this.setFileSummary(username, repo, path, sha, result.summary, result.content, result.file_meta || {}, result.durationMs || 0);
        }

        return { ...result, fromCache: false };
    }

    /**
     * Logs cache hit for debugging
     * @param {string} repo - Repository name
     * @param {string} path - File path
     * @param {string} summary - File summary
     */
    logCacheHit(repo, path, summary) {
        DebugLogger.logCacheHit(repo, path, summary);
    }
}
