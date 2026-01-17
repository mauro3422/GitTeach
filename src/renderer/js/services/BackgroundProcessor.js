/**
 * BackgroundProcessor - Handles background file processing and batch operations
 * Extracted from CodeScanner to comply with SRP
 *
 * Responsibilities:
 * - Process background files in throttled batches
 * - Manage memory persistence for processed repos
 * - Handle AI offline mode and tracer limitations
 * - Coordinate batch processing across repositories
 */
import { Logger } from '../utils/logger.js';
import { AISlotPriorities } from './ai/AISlotManager.js';

export class BackgroundProcessor {
    constructor(fileAuditor) {
        this.fileAuditor = fileAuditor;
    }

    /**
     * Phase 2: Process background files (Unified Queue)
     * Replaces BackgroundAnalyzer
     * @param {string} username - GitHub username
     * @param {Array} allFindings - All repository findings
     * @param {Function} onStep - Progress callback
     * @returns {Promise<void>}
     */
    async processBackgroundFiles(username, allFindings, onStep) {
        let maxBackgroundFiles = 99999;
        if (typeof window !== 'undefined' && window.IS_TRACER) {
            Logger.info('BACKGROUND', 'Tracer Mode: Limiting background analysis to 5 files (Total) for verification.');
            maxBackgroundFiles = 5;
        }

        Logger.background('UnifiedWorkerQueue: Starting background ingestion...');

        // Extract all pending files from findings
        const allPending = this.extractPendingFiles(allFindings);

        if (allPending.length === 0) {
            Logger.success('BACKGROUND', 'No pending files. Full coverage.');
            return;
        }

        // Slice for Tracer limit if applicable
        const filesToProcess = allPending.slice(0, maxBackgroundFiles);

        // Process in throttled batches to avoid network saturation (Downloading is the bottleneck)
        const BATCH_SIZE = 5;
        for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
            if (window.AI_OFFLINE) break;

            const batch = filesToProcess.slice(i, i + BATCH_SIZE);

            // Group batch by repo to minimize context switching
            const batchByRepo = this.groupFilesByRepo(batch);

            await this.processBatchByRepo(username, batchByRepo, onStep);

            // Small breathing room for UI
            await new Promise(r => setTimeout(r, 50));
        }

        Logger.success('BACKGROUND', 'All background files enqueued.');
    }

    /**
     * Extracts pending files from all findings
     * @param {Array} allFindings - All repository findings
     * @returns {Array} Pending files array
     */
    extractPendingFiles(allFindings) {
        const allPending = [];
        const isTracer = typeof window !== 'undefined' && window.IS_TRACER;
        const maxPerRepo = 5;

        allFindings.forEach(f => {
            if (f.pendingFiles && f.pendingFiles.length > 0) {
                // In Tracer mode, only take 5 files per repo to avoid saturating with one big repo
                const files = isTracer ? f.pendingFiles.slice(0, maxPerRepo) : f.pendingFiles;
                files.forEach(file => {
                    allPending.push({ repo: f.repo, ...file });
                });
            }
        });
        return allPending;
    }

    /**
     * Groups files by repository
     * @param {Array} files - Files to group
     * @returns {Object} Files grouped by repository
     */
    groupFilesByRepo(files) {
        const batchByRepo = {};
        files.forEach(item => {
            if (!batchByRepo[item.repo]) batchByRepo[item.repo] = [];
            batchByRepo[item.repo].push(item);
        });
        return batchByRepo;
    }

    /**
     * Processes a batch grouped by repository
     * @param {string} username - GitHub username
     * @param {Object} batchByRepo - Files grouped by repo
     * @param {Function} onStep - Progress callback
     * @returns {Promise<void>}
     */
    async processBatchByRepo(username, batchByRepo, onStep) {
        await Promise.all(Object.keys(batchByRepo).map(async repoName => {
            // Pass AISlotPriorities.BACKGROUND
            await this.fileAuditor.auditFiles(username, repoName, batchByRepo[repoName], true, null, AISlotPriorities.BACKGROUND);
        }));

        // Persist all affected repos in the batch
        const affectedRepos = Object.keys(batchByRepo);
        await this.persistProcessedRepos(affectedRepos);
    }

    /**
     * Persists memory for processed repositories
     * @param {Array} repoNames - Repository names to persist
     * @returns {Promise<void>}
     */
    async persistProcessedRepos(repoNames) {
        const { memoryManager } = await import('./memory/MemoryManager.js');
        await Promise.all(repoNames.map(repoName => memoryManager.persistRepoMemory(repoName)));
    }

    /**
     * Checks if background processing should be skipped
     * @param {Array} allFindings - All findings
     * @returns {boolean} True if should skip
     */
    shouldSkipBackgroundProcessing(allFindings) {
        const allPending = this.extractPendingFiles(allFindings);
        return allPending.length === 0;
    }

    /**
     * Gets the maximum number of background files to process
     * @returns {number} Maximum background files
     */
    getMaxBackgroundFiles() {
        if (typeof window !== 'undefined' && window.IS_TRACER) {
            return 5; // Tracer mode limitation
        }
        return 99999; // Unlimited in normal mode
    }

    /**
     * Gets the batch size for processing
     * @returns {number} Batch size
     */
    getBatchSize() {
        return 5; // Throttled to avoid network saturation
    }

    /**
     * Gets the delay between batches
     * @returns {number} Delay in milliseconds
     */
    getBatchDelay() {
        return 50; // Small breathing room for UI
    }

    /**
     * Checks if AI is offline
     * @returns {boolean} True if AI offline
     */
    isAIOffline() {
        return typeof window !== 'undefined' && window.AI_OFFLINE;
    }

    /**
     * Logs background processing start
     */
    logBackgroundStart() {
        Logger.background('UnifiedWorkerQueue: Starting background ingestion...');
    }

    /**
     * Logs background processing completion
     */
    logBackgroundComplete() {
        Logger.success('BACKGROUND', 'All background files enqueued.');
    }

    /**
     * Logs when no pending files are found
     */
    logNoPendingFiles() {
        Logger.success('BACKGROUND', 'No pending files. Full coverage.');
    }

    /**
     * Logs tracer mode limitation
     */
    logTracerLimitation() {
        Logger.info('BACKGROUND', 'Tracer Mode: Limiting background analysis to 5 files (Total) for verification.');
    }
}
