import { logManager } from '../utils/logManager.js';
import { QueueManager } from './workers/QueueManager.js';
import { RepoContextManager } from './workers/RepoContextManager.js';
import { WorkerPromptBuilder } from './workers/WorkerPromptBuilder.js';
import { ResultProcessor } from './workers/ResultProcessor.js';
import { WorkerHealthMonitor } from './workers/WorkerHealthMonitor.js';

/**
 * AIWorkerPool - Orchestrates parallel AI processing tasks.
 * Uses a modular architecture:
 * - QueueManager: Handles task prioritization and queueing.
 * - RepoContextManager: Manages system prompt and context switching.
 * - WorkerPromptBuilder: Builds specialized prompts for workers.
 * - ResultProcessor: Processes AI output and manages callbacks.
 * - WorkerHealthMonitor: Orchestrates execution and handles timeouts/retries.
 */
export class AIWorkerPool {
    constructor(workerCount = 3, coordinator = null, debugLogger = null) {
        this.logger = logManager.child({ component: 'AIWorkerPool' });
        this.workerCount = workerCount;
        this.coordinator = coordinator;
        this.debugLogger = debugLogger || (typeof DebugLogger !== 'undefined' ? DebugLogger : { isActive: () => false });

        this.logger.debug(`Constructor - Injected Logger: ${!!debugLogger}, IsActive: ${this.debugLogger.isActive()}`);

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
        this.batchSize = (typeof window !== 'undefined' && window.IS_TRACER) ? 1 : 5;
        this.batchBuffer = [];
        this._batchQueue = []; // Buffer for batches finished before callback is assigned

        this.results = [];
    }

    get totalQueued() {
        return this.queueManager.totalQueued;
    }

    get isProcessing() {
        return this.healthMonitor.isCurrentlyProcessing();
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
     * Start processing the queue
     */
    async processQueue(aiService) {
        if (!aiService) throw new Error("AIService is required for AIWorkerPool");

        const workers = [];
        for (let i = 0; i < this.workerCount; i++) {
            workers.push(this._runWorker(aiService, i + 1));
        }

        await Promise.all(workers);
    }

    // =========================================
    // PRIVATE METHODS (Implementation Details)
    // =========================================

    async _runWorker(aiService, workerId) {
        try {
            // Delegate execution to HealthMonitor (It manages the queue loop)
            await this.healthMonitor.runWorker(
                workerId,
                aiService,
                this.coordinator,
                // onFileProcessed adapter
                (repo, path, summary) => {
                    if (this.onFileProcessed) {
                        // Reconstruct a partial result for legacy listeners if needed
                        // But ideally, listeners should rely on the batch or rich events
                        this.onFileProcessed({ repo, path, summary });
                    }
                },
                // onProgress adapter
                (stats) => {
                    if (this.onProgress) {
                        this.onProgress(stats.processed, stats.total);
                    }
                },
                // onBatchComplete adapter
                (batch) => {
                    // Store full results
                    this.results.push(...batch);

                    if (this.onBatchComplete) {
                        this.onBatchComplete(batch);
                    } else {
                        // Store in local buffer if no listener
                        this._batchQueue.push(batch);
                    }
                }
            );
        } catch (error) {
            this.logger.error(`[Worker ${workerId}] Fatal error: ${error.message}`, { error: error.stack });
        }
    }

    _handleResult(result) {
        this.results.push(result);

        // Individual file callback
        if (this.onFileProcessed) {
            this.onFileProcessed(result);
        }

        // Batch management
        this.batchBuffer.push(result);
        if (this.batchBuffer.length >= this.batchSize) {
            const batch = [...this.batchBuffer];
            this.batchBuffer = [];

            if (this.onBatchComplete) {
                this.onBatchComplete(batch);
            } else {
                this._batchQueue.push(batch);
            }
        }

        // Progress callback
        if (this.onProgress) {
            const stats = this.queueManager.getStats();
            this.onProgress(stats.processed, stats.total);
        }
    }

    getStats() {
        return this.queueManager.getStats();
    }
}
