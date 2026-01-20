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
        this.onRepoBatchReady = null;  // NEW: Callback for repo-grouped batches

        // FIX #1: RepoGroupedBuffer - Group findings by repo instead of mixing all
        this.repoBuffers = new Map();  // Map<repoName, findings[]>
        this.repoBatchThreshold = (typeof window !== 'undefined' && window.IS_TRACER) ? 1 : 3;
        this._batchQueue = []; // Buffer for batches finished before callback is assigned

        // Legacy support (deprecated, use onRepoBatchReady instead)
        this.batchSize = this.repoBatchThreshold;
        this.batchBuffer = [];

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

        // Start health monitor broadcasting
        this.healthMonitor.startProcessing();

        const workers = [];
        for (let i = 0; i < this.workerCount; i++) {
            workers.push(this._runWorker(aiService, i + 1));
        }

        this.processingPromise = Promise.all(workers);
        await this.processingPromise;

        // End health monitor broadcasting
        this.healthMonitor.endProcessing();
    }

    /**
     * Wait for all current worker tasks to complete
     */
    async waitForCompletion() {
        if (this.processingPromise) {
            await this.processingPromise;
        }
    }

    /**
     * Gracefully stop all current worker tasks
     */
    stop() {
        this.healthMonitor.requestStop();
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
            throw error; // Propagate to Promise.all so pool knows it failed
        }
    }

    _handleResult(result) {
        this.results.push(result);

        // Individual file callback
        if (this.onFileProcessed) {
            this.onFileProcessed(result);
        }

        // FIX #1: RepoGroupedBuffer - Group by repo and trigger when threshold reached
        const repo = result.repo;
        if (!this.repoBuffers.has(repo)) {
            this.repoBuffers.set(repo, []);
        }
        this.repoBuffers.get(repo).push(result);

        // Check if this repo has enough findings to trigger curation
        if (this.repoBuffers.get(repo).length >= this.repoBatchThreshold) {
            const repoBatch = [...this.repoBuffers.get(repo)];
            this.repoBuffers.set(repo, []);  // Clear this repo's buffer

            this.logger.debug(`[RepoGroupedBuffer] Repo "${repo}" reached ${repoBatch.length} findings, triggering curation`);

            // NEW: Repo-specific batch callback (preferred)
            if (this.onRepoBatchReady) {
                this.onRepoBatchReady(repoBatch, repo);
            }
            // Legacy: Also call onBatchComplete for backward compatibility
            else if (this.onBatchComplete) {
                this.onBatchComplete(repoBatch);
            } else {
                this._batchQueue.push(repoBatch);
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
