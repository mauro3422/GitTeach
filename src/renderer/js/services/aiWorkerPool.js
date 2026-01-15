/**
 * AIWorkerPool - Orchestrates N AI workers that process files in parallel
 * Uses llama-server slots for real GPU concurrency
 * REFACTORED: Delegates to specialized modules (SRP compliant)
 * 
 * SOLID Principles:
 * - S: Only orchestrates workers and coordinates modules
 * - O: Extensible via callbacks (onFileProcessed, onBatchComplete)
 * - L: N/A (no inheritance)
 * - I: Minimal interface (enqueue, processAll)
 * - D: Depends on injected AIService and CoordinatorAgent
 * 
 * Extracted Modules:
 * - QueueManager: Queue handling, batching, affinity scheduling
 * - RepoContextManager: Cumulative context, Golden Knowledge compaction
 * - WorkerPromptBuilder: Prompt generation, pre-filtering, response parsing
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { DebugLogger } from '../utils/debugLogger.js';
import { QueueManager } from './workers/QueueManager.js';
import { RepoContextManager } from './workers/RepoContextManager.js';
import { WorkerPromptBuilder } from './workers/WorkerPromptBuilder.js';

export class AIWorkerPool {
    constructor(workerCount = 3, coordinator = null, debugLogger = null) {
        this.workerCount = workerCount;
        this.coordinator = coordinator;
        this.debugLogger = debugLogger || DebugLogger;

        console.log(`[AIWorkerPool] Constructor - Injected Logger: ${!!debugLogger}, IsActive: ${this.debugLogger.isActive()}, Path: ${this.debugLogger.sessionPath}`);

        // Delegate to specialized modules
        this.queueManager = new QueueManager();
        this.contextManager = new RepoContextManager();
        this.promptBuilder = new WorkerPromptBuilder();

        // Callbacks (PUBLIC API - DO NOT CHANGE)
        this.onProgress = null;
        this.onFileProcessed = null;
        this.onBatchComplete = null;
        this.batchSize = 5;
        this.batchBuffer = [];

        this.isProcessing = false;
        this.results = [];
    }

    // =========================================
    // PUBLIC API (Contract - DO NOT BREAK)
    // =========================================

    /**
     * Enqueue a file for processing
     */
    enqueue(repoName, filePath, content, sha) {
        this.queueManager.enqueue(repoName, filePath, content, sha);
    }

    /**
     * Enqueue multiple files
     */
    enqueueBatch(files) {
        this.queueManager.enqueueBatch(files);
    }

    /**
     * Process entire queue using N parallel workers
     */
    async processAll(aiService) {
        if (this.isProcessing) {
            console.warn('[AIWorkerPool] Already processing');
            return this.results;
        }

        this.isProcessing = true;
        this.results = [];

        // Create N workers that process in parallel
        const workers = [];
        for (let i = 0; i < this.workerCount; i++) {
            workers.push(this.runWorker(i + 1, aiService));
        }

        // Wait for all workers to finish
        await Promise.all(workers);

        // Flush remaining buffer
        if (this.onBatchComplete && this.batchBuffer.length > 0) {
            this.onBatchComplete(this.batchBuffer);
            this.batchBuffer = [];
        }

        this.isProcessing = false;
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

    // =========================================
    // INTERNAL WORKER LOGIC
    // =========================================

    /**
     * Individual worker: takes items from queue and processes them
     */
    async runWorker(workerId, aiService) {
        Logger.worker(workerId, 'Starting...');
        let claimedRepo = null;
        let lastProcessedPath = null;

        while (true) {
            // Get next item from queue
            const input = this.queueManager.getNextItem(workerId, claimedRepo, lastProcessedPath);

            if (!input) {
                if (claimedRepo) {
                    Logger.worker(workerId, `Finished repo [${claimedRepo}]. Clearing affinities.`);
                    claimedRepo = null;
                    lastProcessedPath = null;
                    continue;
                }
                Logger.worker(workerId, 'Queue empty or repos busy, terminating');
                break;
            }

            const isBatch = input.isBatch;
            const items = isBatch ? input.items : [input];
            const nextRepo = items[0].repo;

            // Detect repo change: reset affinity and context
            if (claimedRepo && nextRepo !== claimedRepo) {
                Logger.worker(workerId, `>>> CONTEXT SWITCH: From [${claimedRepo}] to [${nextRepo}]. Resetting.`);
                lastProcessedPath = null;
                this.contextManager.clearRepoContext(claimedRepo);
            }

            claimedRepo = nextRepo;
            lastProcessedPath = items[items.length - 1].path;

            // Mark items as processing
            items.forEach(i => i.status = 'processing');

            if (isBatch) {
                Logger.worker(workerId, `Processing BATCH [${claimedRepo}] (${items.length} files)`);
            } else {
                Logger.worker(workerId, `Processing [${claimedRepo}]: ${input.path}`);
            }

            try {
                // Call AI to summarize the file or batch
                const { prompt, summary, langCheck } = await this._summarizeWithAI(aiService, input);

                // Parse response
                const parsed = this.promptBuilder.parseResponse(summary);
                const finalSummary = parsed?.tool === 'skip'
                    ? "SKIP: Content not relevant or empty."
                    : summary;

                // Process results
                this._processResults(workerId, items, finalSummary, parsed, aiService, prompt, isBatch, claimedRepo);

            } catch (error) {
                Logger.worker(workerId, `Error: ${error.message}`);
                this._handleError(workerId, items, error, isBatch, claimedRepo);
            }
        }
    }

    /**
     * Call AI to summarize a file or batch
     */
    async _summarizeWithAI(aiService, input) {
        const systemPrompt = this.promptBuilder.buildSystemPrompt();
        const { prompt: userPrompt, skipReason, langCheck } = this.promptBuilder.buildUserPrompt(input);

        // Pre-filtered
        if (skipReason) {
            return { prompt: 'PRE-FILTERED', summary: `SKIP: ${skipReason}`, langCheck: { valid: true } };
        }

        let summary = await aiService.callAI(systemPrompt, userPrompt, 0.1);

        // Post-process with anomaly tagging
        summary = this.promptBuilder.postProcessSummary(summary, langCheck || { valid: true });

        return {
            prompt: `${systemPrompt}\n\n${userPrompt}`,
            summary,
            langCheck: langCheck || { valid: true }
        };
    }

    /**
     * Process successful results
     */
    _processResults(workerId, items, summary, parsed, aiService, prompt, isBatch, claimedRepo) {
        items.forEach(item => {
            item.status = 'completed';
            item.summary = summary;

            const resultItem = {
                repo: item.repo,
                path: item.path,
                summary: summary,
                workerId: workerId,
                classification: parsed?.params?.technical_strength || 'General'
            };

            this.results.push(resultItem);

            // Streaming Buffer logic
            this.batchBuffer.push(resultItem);
            if (this.onBatchComplete && this.batchBuffer.length >= this.batchSize) {
                const batch = [...this.batchBuffer];
                this.batchBuffer = [];
                this.onBatchComplete(batch);
            }

            // Add to repo context for future files
            this.contextManager.addToRepoContext(item.repo, item.path, summary, aiService);

            // Update Coordinator
            if (this.coordinator) {
                this.coordinator.markCompleted(item.repo, item.path, summary, parsed || null);
            }

            // Audit logging
            CacheRepository.setWorkerAudit(workerId, {
                timestamp: new Date().toISOString(),
                repo: item.repo,
                path: item.path,
                summary: summary,
                classification: parsed?.params?.technical_strength || 'General'
            });
        });

        // Debug logging
        if (!this.debugLogger.isActive()) {
            console.warn(`[AIWorkerPool] ⚠️ DebugLogger INACTIVE. Enabled: ${this.debugLogger.enabled}, Session: ${this.debugLogger.sessionPath}`);
        }

        this.debugLogger.logWorker(workerId, {
            input: isBatch ? { repo: claimedRepo, paths: items.map(i => i.path) } : { repo: items[0].repo, path: items[0].path, contentLength: items[0].content?.length },
            prompt: prompt,
            output: summary
        });

        // Update progress (FIX: Only increment once!)
        this.queueManager.markProcessed(items.length);

        if (this.onFileProcessed) {
            items.forEach(item => this.onFileProcessed(item.repo, item.path, summary));
        }

        if (this.onProgress) {
            const stats = this.queueManager.getStats();
            this.onProgress({
                workerId,
                processed: stats.processed,
                total: stats.queued,
                percent: stats.percent,
                file: items[items.length - 1].path
            });
        }
    }

    /**
     * Handle processing errors
     */
    _handleError(workerId, items, error, isBatch, claimedRepo) {
        this.debugLogger.logWorker(workerId, {
            input: isBatch ? { repo: claimedRepo, paths: items.map(i => i.path) } : { repo: items[0].repo, path: items[0].path },
            prompt: "ERROR_DURING_EXECUTION",
            output: null,
            error: error.message
        });

        items.forEach(item => {
            item.status = 'failed';
            item.error = error.message;
        });

        this.queueManager.markProcessed(items.length);
    }
}
