/**
 * FileDownloader.js
 * Handles file downloading from GitHub API and caching operations.
 * Extracted from FileAuditor to comply with SRP.
 */

import { CacheRepository } from '../utils/cacheRepository.js';
import { DebugLogger } from '../utils/debugLogger.js';
import { pipelineController } from './pipeline/PipelineController.js';
import { pipelineEventBus } from './pipeline/PipelineEventBus.js';

export class FileDownloader {
    /**
     * Download file content from GitHub API
     * @param {string} username - GitHub username
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @returns {Promise<Object>} File content response
     */
    async downloadFile(username, repoName, filePath) {
        // PAUSE/STEP CHECK: Pipeline Controller synchronization
        while (!pipelineController.canProceed()) {
            await new Promise(r => setTimeout(r, 300));
        }

        pipelineEventBus.emit('api:fetch', { repo: repoName, file: filePath, status: 'start' });
        const contentRes = await window.githubAPI.getFileContent(username, repoName, filePath);
        pipelineEventBus.emit('api:fetch', { repo: repoName, file: filePath, status: 'end' });

        return contentRes;
    }

    /**
     * Process downloaded file content and prepare for caching
     * @param {Object} contentRes - GitHub API response
     * @param {string} filePath - File path
     * @returns {Object} Processed content data
     */
    processDownloadedContent(contentRes, filePath) {
        if (!contentRes || !contentRes.content) {
            return null;
        }

        const contentSnippet = atob(contentRes.content.replace(/\n/g, ''));

        return {
            contentSnippet,
            filePath,
            sha: contentRes.sha,
            fileMeta: contentRes.file_meta || {}
        };
    }

    /**
     * Cache file content and metadata
     * @param {string} username - GitHub username
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @param {string} sha - File SHA
     * @param {string} summary - Content summary (first 500 chars)
     * @param {string} fullContent - Full content snippet
     * @param {Object} fileMeta - File metadata
     */
    async cacheFile(username, repoName, filePath, sha, summary, fullContent, fileMeta = {}) {
        pipelineEventBus.emit('cache:store', { repo: repoName, file: filePath });
        await CacheRepository.setFileSummary(
            username, repoName, filePath,
            sha,
            summary,
            fullContent,
            fileMeta
        );
    }

    /**
     * Check if file needs to be downloaded (not cached or outdated)
     * @param {string} username - GitHub username
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @param {string} fileSha - File SHA
     * @returns {Promise<boolean>} True if needs update
     */
    async needsDownload(username, repoName, filePath, fileSha) {
        return await CacheRepository.needsUpdate(username, repoName, filePath, fileSha);
    }

    /**
     * Get cached file summary
     * @param {string} username - GitHub username
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @returns {Promise<Object>} Cached summary
     */
    async getCachedSummary(username, repoName, filePath) {
        return await CacheRepository.getFileSummary(username, repoName, filePath);
    }
}

export const fileDownloader = new FileDownloader();
