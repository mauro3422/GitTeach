/**
 * AIWorkerPool - Lightweight facade for AI worker orchestration
 * REFACTORED: Delegates to specialized modules (SRP compliant)
 *
 * SOLID Principles:
 * - S: Only orchestrates workers and coordinates modules
 * - O: Extensible via callbacks (onFileProcessed, onBatchComplete)
 * - L: N/A (no inheritance)
 * - I: Minimal interface (enqueue, processAll)
 * - D: Depends on injected AIService and CoordinatorAgent
 *
 * Composed Modules:
 * - QueueManager: Queue handling, batching, affinity scheduling
 * - RepoContextManager: Cumulative context, Golden Knowledge compaction
 * - WorkerPromptBuilder: Prompt generation, pre-filtering, response parsing
 * - ResultProcessor: AI result processing and error handling
 * - WorkerHealthMonitor: Worker health monitoring and statistics
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { DebugLogger } from '../utils/debugLogger.js';
import { QueueManager } from './workers/QueueManager.js';
import { RepoContextManager } from './workers/RepoContextManager.js';
import { WorkerPromptBuilder } from './workers/WorkerPromptBuilder.js';
import { ResultProcessor } from './workers/ResultProcessor.js';
import { WorkerHealthMonitor } from './workers/WorkerHealthMonitor.js';
import { AISlotPriorities } from './ai/AISlotManager.js';

export class AIWorkerPool {
    constructor(workerCount = 3, coordinator = null, debugLogger = null) {
        this.workerCount = workerCount;
        this.coordinator = coordinator;
        this.debugLogger = debugLogger || DebugLogger;

        console.log(`[AIWorkerPool] Constructor - Injected Logger: ${!!debugLogger}, IsActive: ${this.debugLogger.isActive()}, Path: ${this.debugLogger.sessionPath}`);

        // Compose specialized modules
        this.queueManager = new QueueManager();
        this.contextManager = new RepoContextManager();
        this.promptBuilder = new WorkerPromptBuilder();
        this.resultProcessor = new ResultProcessor(this.queueManager, this.contextManager, this.promptBuilder, this.debugLogger);
        this.healthMonitor = new WorkerHealthMonitor(this.queueManager, this.resultProcessor);

        // Callbacks (PUBLIC API - DO NOT CHANGE)
        this.onProgress = null;
        this.onFileProcessed = null;
        this.onBatchComplete = null;
        this.batchSize = 5;
        this.onBatchComplete = null;
        this.batchSize = 5;
        this.batchBuffer = [];
        this._batchQueue = []; // Buffer for batches finished before callback is assigned

        this.results = [];
    }

    // =========================================
    // PUBLIC API (Contract - DO NOT BREAK)
    // =========================================

    /**
     * Enqueue a file for processing
     */
    enqueue(repoName, filePath, content, sha, priority = 1, fileMeta = {}) { // Default NORMAL (1)
        this.queueManager.enqueue(repoName, filePath, content, sha, priority, fileMeta);
    }

    /**
     * Enqueue multiple files
     */
    enqueueBatch(files, priority = 1) {
        files.forEach(f => this.enqueue(f.repo, f.path, f.content, f.sha, priority, f.file_meta || {}));
    }

    /**
     * Process entire queue using N parallel workers
     */
    async processAll(aiService) {
        if (!this.healthMonitor.startProcessing()) {
            console.warn('[AIWorkerPool] Already processing');
            return this.results;
        }

        this.results = [];

        // Create N workers that process in parallel
        const workers = [];
        for (let i = 0; i < this.workerCount; i++) {
            workers.push(this.healthMonitor.runWorker(
                i + 1,
                aiService,
                this.coordinator,
                this.onFileProcessed,
                this.onProgress,
                this.onBatchComplete
            ));
        }

        // Wait for all workers to finish
        await Promise.all(workers);

        // Flush remaining buffer
        // Flush remaining buffer
        if (this.batchBuffer.length > 0) {
            if (this.onBatchComplete) {
                this.onBatchComplete(this.batchBuffer);
            } else {
                // If no callback, store it temporarily
                this._batchQueue.push([...this.batchBuffer]);
            }
            this.batchBuffer = [];
        }

        // Check for any buffered queues that missed the callback
        if (this.onBatchComplete && this._batchQueue.length > 0) {
            this._batchQueue.forEach(b => this.onBatchComplete(b));
            this._batchQueue = [];
        }

        this.healthMonitor.endProcessing();
        return this.results;
    }

    /**
     * Get current statistics (PUBLIC API)
     */
    getStats() {
        return this.queueManager.getStats();
    }

    /**
     * Get total queued count (PUBLIC API - used by ProfileAnalyzer)
     */
    get totalQueued() {
        return this.queueManager.totalQueued;
    }

    /**
     * Clear queue and contexts
     */
    clear() {
        this.queueManager.clear();
        this.contextManager.clear();
        this.results = [];
    }


}
