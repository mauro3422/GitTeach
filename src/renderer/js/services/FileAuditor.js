/**
 * FileAuditor - Orchestrates file auditing by delegating to specialized managers.
 * Maintains backward compatibility while applying SRP.
 *
 * Responsibilities:
 * - Coordinate file auditing workflow
 * - Delegate to specialized managers for specific operations
 */
import { AISlotPriorities } from './ai/AISlotManager.js';
import { pipelineController } from './pipeline/PipelineController.js';
import { pipelineEventBus } from './pipeline/PipelineEventBus.js';
import { PIPELINE_CONFIG } from '../views/pipeline/pipelineConfig.js';
import { fileDownloader } from './FileDownloader.js';
import { fileProcessor } from './FileProcessor.js';
import { findingsCurator } from './FindingsCurator.js';

export class FileAuditor {
    constructor(coordinator, workerPool) {
        this.coordinator = coordinator;
        this.workerPool = workerPool;
        this.fileDownloader = fileDownloader;
        this.fileProcessor = fileProcessor;
        this.findingsCurator = findingsCurator;
    }

    /**
     * Audits a list of files by coordinating specialized managers
     * @param {string} username - GitHub username
     * @param {string} repoName - Repository name
     * @param {Array} files - Files to audit
     * @param {boolean} needsFullScan - Whether full scan is needed
     * @param {Function} onStep - Progress callback
     * @param {string} priority - AI processing priority
     * @returns {Promise<Array>} Audited file results
     */
    async auditFiles(username, repoName, files, needsFullScan, onStep, priority = AISlotPriorities.NORMAL) {
        return await Promise.all(files.map(async (file) => {
            try {
                // Check if we need to download/update the file
                const needsDownload = await this.fileDownloader.needsDownload(username, repoName, file.path, file.sha);

                if (!needsDownload) {
                    // Try to get from cache first
                    return await this.processCachedFile(username, repoName, file, priority);
                }

                // Download and process new file
                return await this.processNewFile(username, repoName, file, onStep, priority);
            } catch (error) {
                console.error(`[FileAuditor] Error processing ${file.path}:`, error);
                return null;
            }
        }));
    }

    /**
     * Process a file that exists in cache
     */
    async processCachedFile(username, repoName, file, priority) {
        const cached = await this.fileDownloader.getCachedSummary(username, repoName, file.path);

        if (cached && cached.aiSnippet) {
            // Use full cached content
            this.coordinator.markCompleted(repoName, file.path, cached.summary, { file_meta: cached.file_meta || {} });
            pipelineEventBus.emit('file:cached', { repo: repoName, file: file.path });

            // Enqueue for processing if in tracer mode
            if (window.IS_TRACER) {
                this.fileProcessor.enqueueForProcessing(repoName, file.path, cached.aiSnippet, file.sha, priority, cached.file_meta, this.workerPool);
            }

            return { path: file.path, snippet: cached.aiSnippet, fromCache: true };
        }

        // Fallback to content snippet
        if (cached) {
            this.coordinator.markCompleted(repoName, file.path, cached.summary, { file_meta: cached.file_meta || {} });
            pipelineEventBus.emit('file:cached', { repo: repoName, file: file.path });

            if (window.IS_TRACER) {
                this.fileProcessor.enqueueForProcessing(repoName, file.path, cached.contentSnippet || '', file.sha, priority, cached.file_meta, this.workerPool);
            }

            return { path: file.path, snippet: cached.contentSnippet || '', fromCache: true };
        }

        return null;
    }

    /**
     * Process a new file that needs to be downloaded
     */
    async processNewFile(username, repoName, file, onStep, priority) {
        if (onStep) {
            const stats = this.coordinator.getStats();
            onStep({ type: 'Progreso', percent: stats.progress, message: `Downloading ${file.path}...` });
        }

        // Download file content
        const contentRes = await this.fileDownloader.downloadFile(username, repoName, file.path);
        if (!contentRes || !contentRes.content) {
            return null;
        }

        // Process downloaded content
        const processedContent = this.fileDownloader.processDownloadedContent(contentRes, file.path);
        if (!processedContent) {
            return null;
        }

        const { contentSnippet, sha, fileMeta } = processedContent;

        // Cache the file
        await this.fileDownloader.cacheFile(
            username, repoName, file.path, sha,
            contentSnippet.substring(0, 500), // summary
            contentSnippet, // full content
            fileMeta
        );

        // Enqueue for AI processing
        this.fileProcessor.enqueueForProcessing(repoName, file.path, contentSnippet, sha, priority, fileMeta, this.workerPool);

        // Handle high-fidelity seed processing
        const seedResult = this.fileProcessor.processHighFidelitySeed(
            repoName, file.path,
            typeof window !== 'undefined' && window.IS_TRACER,
            window.FORCE_REAL_AI,
            this.workerPool
        );

        if (seedResult.shouldSkip) {
            // Use skeleton data
            const skeletonData = this.findingsCurator.createSkeletonMetadata(fileMeta);
            const semanticSummary = this.findingsCurator.createSemanticSummary(file.path);
            this.coordinator.markCompleted(repoName, file.path, semanticSummary, skeletonData);
        }
        // If it's a seed, it will be processed by the worker pool

        return { path: file.path, snippet: contentSnippet };
    }

    /**
     * Identifies relevant files for analysis - BROADENED for 100% coverage
     * @param {Array} tree - Repository file tree
     * @param {string} repoName - Name of the repository
     * @returns {Array} Filtered anchor files
     */
    identifyAnchorFiles(tree, repoName = 'unknown') {
        return this.findingsCurator.identifyAnchorFiles(tree, repoName);
    }

    /**
     * Curates findings for the main AI
     * @param {Array} findings - Raw findings
     * @returns {Array} Curated findings
     */
    curateFindings(findings) {
        return this.findingsCurator.curateFindings(findings);
    }

    /**
     * Checks if file needs update based on cache
     * @param {string} username - GitHub username
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @param {string} fileSha - File SHA
     * @returns {Promise<boolean>} True if update needed
     */
    async needsUpdate(username, repoName, filePath, fileSha) {
        return await this.fileDownloader.needsDownload(username, repoName, filePath, fileSha);
    }

    /**
     * Gets cached file summary
     * @param {string} username - GitHub username
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @returns {Promise<Object>} Cached summary
     */
    async getCachedSummary(username, repoName, filePath) {
        return await this.fileDownloader.getCachedSummary(username, repoName, filePath);
    }

    /**
     * Saves file summary to cache
     * @param {string} username - GitHub username
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @param {string} sha - File SHA
     * @param {string} summary - File summary
     * @param {string} contentSnippet - Content snippet
     * @param {Object} fileMeta - File metadata
     */
    async saveToCache(username, repoName, filePath, sha, summary, contentSnippet, fileMeta = {}) {
        await this.fileDownloader.cacheFile(username, repoName, filePath, sha, summary, contentSnippet, fileMeta);
    }

    /**
     * Checks if worker queue has capacity
     * @returns {boolean} True if can enqueue more files
     */
    hasQueueCapacity() {
        return this.workerPool.totalQueued < PIPELINE_CONFIG.MAX_WORKER_QUEUE_SIZE;
    }

    /**
     * Gets maximum code snippet length
     * @returns {number} Maximum length
     */
    getMaxSnippetLength() {
        return PIPELINE_CONFIG.MAX_CODE_SNIPPET_LENGTH;
    }
}
