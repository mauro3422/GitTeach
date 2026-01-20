/**
 * FileProcessor.js
 * Handles file processing, worker pool enqueuing, and high-fidelity seed logic.
 * Extracted from FileAuditor to comply with SRP.
 */

import { AISlotPriorities } from './ai/AISlotManager.js';
import { pipelineEventBus } from './pipeline/PipelineEventBus.js';
import { PIPELINE_CONFIG } from '../views/pipeline/pipelineConfig.js';

export class FileProcessor {
    constructor() {
        this.seedsProcessed = 0; // Local counter for High-Fidelity Seeds (Tracer)
    }

    /**
     * Enqueue file for AI processing if worker pool has capacity
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @param {string} contentSnippet - File content
     * @param {string} sha - File SHA
     * @param {string} priority - Processing priority
     * @param {Object} fileMeta - File metadata
     * @param {Object} workerPool - Worker pool instance
     * @returns {boolean} True if enqueued successfully
     */
    enqueueForProcessing(repoName, filePath, contentSnippet, sha, priority = AISlotPriorities.NORMAL, fileMeta = {}, workerPool) {
        if (workerPool.totalQueued >= PIPELINE_CONFIG.MAX_WORKER_QUEUE_SIZE) {
            return false;
        }

        pipelineEventBus.emit('file:queued', { repo: repoName, file: filePath });
        workerPool.enqueue(repoName, filePath, contentSnippet, sha, priority, fileMeta);
        return true;
    }

    /**
     * Process high-fidelity seed logic for tracer mode
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @param {boolean} isTracerMode - Whether in tracer mode
     * @param {boolean} forceRealAI - Whether to force real AI processing
     * @param {Object} workerPool - Worker pool instance
     * @returns {Object} Processing result
     */
    processHighFidelitySeed(repoName, filePath, isTracerMode, forceRealAI, workerPool) {
        const isHighFidelitySeed = isTracerMode &&
            (forceRealAI || this.seedsProcessed < PIPELINE_CONFIG.HIGH_FIDELITY_SEED_LIMIT);

        if (!isHighFidelitySeed) {
            return { shouldSkip: true, isSeed: false };
        }

        this.seedsProcessed++;

        if (this.isNodeEnvironment()) {
            this.logSeedProcessing(filePath);
        }

        return { shouldSkip: false, isSeed: true };
    }

    /**
     * Check if running in Node.js environment
     * @returns {boolean} True if Node environment
     */
    isNodeEnvironment() {
        return typeof process !== 'undefined' && process.versions?.node;
    }

    /**
     * Log seed processing in Node environment
     * @param {string} filePath - File path being processed
     */
    logSeedProcessing(filePath) {
        try {
            const path = require('path');
            const fs = require('fs');
            const logPath = path.join(process.cwd(), 'debug_auditor.log');
            const msg = `[FileProcessor] HIGH FIDELITY SEED #${this.seedsProcessed}: ${filePath} (Bypassing Skeleton)\n`;
            fs.appendFileSync(logPath, msg);
        } catch (e) {
            // Ignore logging errors
        }
    }

    /**
     * Log cache hit in Node environment
     * @param {string} repoName - Repository name
     * @param {string} filePath - File path
     * @param {boolean} isTracerMode - Whether in tracer mode
     * @param {number} queuedCount - Number of queued items
     * @param {boolean} willEnqueue - Whether will enqueue
     */
    logCacheHit(repoName, filePath, isTracerMode, queuedCount, willEnqueue) {
        if (!this.isNodeEnvironment()) return;

        try {
            const path = require('path');
            const fs = require('fs');
            const logPath = path.join(process.cwd(), 'debug_auditor.log');
            const msg = `[FileProcessor] Cache Hit. IS_TRACER=${isTracerMode}, Queued=${queuedCount}. EnQUEUE? ${willEnqueue}\n`;
            fs.appendFileSync(logPath, msg);
        } catch (e) {
            // Ignore logging errors
        }
    }

    /**
     * Log fresh enqueue in Node environment
     * @param {string} filePath - File path being enqueued
     */
    logFreshEnqueue(filePath) {
        if (!this.isNodeEnvironment()) return;

        try {
            const path = require('path');
            const fs = require('fs');
            const logPath = path.join(process.cwd(), 'debug_auditor.log');
            fs.appendFileSync(logPath, `[FileProcessor] FRESH Enqueue ${filePath}\n`);
        } catch (e) {
            // Ignore logging errors
        }
    }

    /**
     * Reset the seeds processed counter
     */
    resetSeedsCounter() {
        this.seedsProcessed = 0;
    }

    /**
     * Get current seeds processed count
     * @returns {number} Seeds processed count
     */
    getSeedsProcessedCount() {
        return this.seedsProcessed;
    }
}

export const fileProcessor = new FileProcessor();
