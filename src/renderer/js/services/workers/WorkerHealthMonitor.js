/**
 * WorkerHealthMonitor - Monitors worker health and processing status
 * Extracted from AIWorkerPool to comply with SRP
 *
 * Responsibilities:
 * - Monitor worker processing status and health
 * - Track worker statistics and performance
 * - Handle worker lifecycle and affinity management
 * - Provide worker status reports and diagnostics
 */
import { Logger } from '../../utils/logger.js';
import { pipelineController } from '../pipeline/PipelineController.js';
import { pipelineEventBus } from '../pipeline/PipelineEventBus.js';

export class WorkerHealthMonitor {
    constructor(queueManager, resultProcessor) {
        this.queueManager = queueManager;
        this.resultProcessor = resultProcessor;
        this.workerStats = new Map();
        this.isProcessing = false;
        this.stopRequested = false;
        this.channel = new BroadcastChannel('giteach-monitoring');
        this.broadcastInterval = null;
    }

    /**
     * Check if processing is currently active
     * @returns {boolean} True if processing
     */
    isCurrentlyProcessing() {
        return this.isProcessing;
    }

    /**
     * Start processing session
     */
    startProcessing() {
        if (this.isProcessing) {
            console.warn('[WorkerHealthMonitor] Already processing');
            return false;
        }
        this.isProcessing = true;
        this.resetWorkerStats();

        // Start broadcasting
        if (this.channel) {
            this.broadcastInterval = setInterval(() => this.broadcastStatus(), 500);
        }

        return true;
    }

    /**
     * End processing session
     */
    endProcessing() {
        this.isProcessing = false;
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
        }
    }

    /**
     * Request all workers to stop
     */
    requestStop() {
        this.logger.info('Stop requested by user.');
        this.stopRequested = true;
    }

    /**
     * Run individual worker process
     * @param {number} workerId - Worker identifier
     * @param {Object} aiService - AI service instance
     * @param {Object} coordinator - Coordinator instance
     * @param {Function} onFileProcessed - File processed callback
     * @param {Function} onProgress - Progress callback
     * @param {Function} onBatchComplete - Batch complete callback
     * @returns {Promise<void>}
     */
    async runWorker(workerId, aiService, coordinator, onFileProcessed, onProgress, onBatchComplete) {
        Logger.worker(workerId, 'Starting...');
        let claimedRepo = null;
        let lastProcessedPath = null;
        const workerStartTime = Date.now();

        this.initializeWorkerStats(workerId);

        while (true) {
            // EMERGENCY STOP: Check if AI Service is in fatal state or user requested stop
            if (aiService.isFatal || this.stopRequested) {
                Logger.worker(workerId, aiService.isFatal ? '🚨 FATAL AI STATE DETECTED.' : '🛑 STOP REQUESTED.');
                break;
            }

            // PAUSE/STEP CHECK: Pipeline Controller synchronization
            if (!pipelineController.canProceed()) {
                await new Promise(r => setTimeout(r, 200));
                continue;
            }

            // Get next item from queue
            const input = this.queueManager.getNextItem(workerId, claimedRepo, lastProcessedPath);

            // GRACEFUL DRAIN: Handle waiting sentinel
            if (input?.isWaiting) {
                await new Promise(r => setTimeout(r, 100));
                continue; // Reintentar
            }

            if (!input) {
                if (claimedRepo) {
                    Logger.worker(workerId, `Finished repo [${claimedRepo}]. Clearing affinities.`);
                    this.updateWorkerStats(workerId, 'reposCompleted', 1);
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
                this.updateWorkerStats(workerId, 'contextSwitches', 1);
                lastProcessedPath = null;
            }

            claimedRepo = nextRepo;
            lastProcessedPath = items[items.length - 1].path;

            // Mark items as processing
            items.forEach(i => i.status = 'processing');

            if (isBatch) {
                Logger.worker(workerId, `Processing BATCH [${claimedRepo}] (${items.length} files)`);
                this.updateWorkerStats(workerId, 'batchesProcessed', 1);
            } else {
                Logger.worker(workerId, `Processing [${claimedRepo}]: ${nextRepo === claimedRepo ? input.path : claimedRepo + ' -> ' + input.path}`);
                this.updateWorkerStats(workerId, 'filesProcessed', 1);
            }

            // PIPELINE EVENT: Slot activity
            pipelineEventBus.emit(`worker:slot:${workerId}`, {
                repo: claimedRepo,
                file: isBatch ? 'batch' : input.path,
                status: 'start'
            });

            try {
                const startTime = Date.now();

                // Call AI to summarize the file or batch
                const { prompt, summary, langCheck } = await this.resultProcessor.summarizeWithAI(aiService, input);

                const durationMs = Date.now() - startTime;

                // Parse response
                const parsed = this.resultProcessor.promptBuilder.parseResponse(summary, isBatch ? null : input.path);
                const finalSummary = summary;

                // Process results
                const { results, batchBuffer } = await this.resultProcessor.processResults(
                    workerId, items, finalSummary, parsed, aiService, prompt, isBatch, claimedRepo, durationMs
                );

                // Update coordinator and callbacks
                // Fix: Ensure batchBuffer contains the processed results, not raw inputs
                // If ResultProcessor returns weird batchBuffer, usage results instead
                const effectiveBatch = (batchBuffer && batchBuffer.length > 0 && batchBuffer[0].workerId)
                    ? batchBuffer
                    : results;

                this.updateCoordinatorAndCallbacks(
                    results, effectiveBatch, coordinator, onFileProcessed, onProgress, onBatchComplete, workerId
                );

                this.updateWorkerStats(workerId, 'processingTimeMs', durationMs);
                this.updateWorkerStats(workerId, 'successfulOperations', 1);

                // If we were STEPPING, notify controller that this step finished
                pipelineController.stepComplete();

                pipelineEventBus.emit(`worker:slot:${workerId}`, {
                    repo: claimedRepo,
                    file: isBatch ? 'batch' : input.path,
                    status: 'end'
                });

            } catch (error) {
                this.resultProcessor.handleError(workerId, items, error, isBatch, claimedRepo);
                this.updateWorkerStats(workerId, 'failedOperations', 1);
                this.updateWorkerStats(workerId, 'errorMessages', error.message);
            }
        }

        const totalTime = Date.now() - workerStartTime;
        this.finalizeWorkerStats(workerId, totalTime);
        Logger.worker(workerId, `Terminated after ${totalTime}ms`);
    }

    /**
     * Update coordinator and callbacks with results
     * @param {Array} results - Processing results
     * @param {Array} batchBuffer - Batch buffer
     * @param {Object} coordinator - Coordinator instance
     * @param {Function} onFileProcessed - File processed callback
     * @param {Function} onProgress - Progress callback
     * @param {Function} onBatchComplete - Batch complete callback
     * @param {number} workerId - Worker identifier
     */
    updateCoordinatorAndCallbacks(results, batchBuffer, coordinator, onFileProcessed, onProgress, onBatchComplete, workerId) {
        // Update coordinator with results
        if (coordinator) {
            results.forEach(result => {
                coordinator.markCompleted(result.repo, result.path, result.summary, result);
            });
        }

        // Handle batch buffering
        if (onBatchComplete && batchBuffer.length > 0) {
            onBatchComplete(batchBuffer);
        }

        // Call file processed callback
        if (onFileProcessed) {
            results.forEach(result => {
                onFileProcessed(result.repo, result.path, result.summary);
            });
        }

        // Call progress callback
        if (onProgress) {
            const stats = this.queueManager.getStats();
            onProgress({
                workerId,
                processed: stats.processed,
                total: stats.queued,
                percent: stats.percent,
                file: results[results.length - 1]?.path
            });
        }
    }

    /**
     * Get overall worker health status
     * @returns {Object} Health status report
     */
    getHealthStatus() {
        const queueStats = this.queueManager.getStats();
        const workerStats = Array.from(this.workerStats.values());

        return {
            isProcessing: this.isProcessing,
            queueHealth: {
                totalQueued: queueStats.queued,
                totalProcessed: queueStats.processed,
                completionRate: queueStats.percent
            },
            workerHealth: {
                activeWorkers: workerStats.filter(w => w.isActive).length,
                totalWorkers: workerStats.length,
                averageProcessingTime: this.calculateAverageProcessingTime(workerStats),
                errorRate: this.calculateErrorRate(workerStats)
            },
            systemHealth: {
                memoryUsage: this.getMemoryUsage(),
                uptime: this.getUptime()
            }
        };
    }

    /**
     * Get detailed worker statistics
     * @param {number} workerId - Specific worker ID or null for all
     * @returns {Object|Array} Worker statistics
     */
    getWorkerStats(workerId = null) {
        if (workerId !== null) {
            return this.workerStats.get(workerId) || null;
        }
        return Array.from(this.workerStats.entries()).map(([id, stats]) => ({ workerId: id, ...stats }));
    }

    /**
     * Reset worker statistics
     */
    resetWorkerStats() {
        this.workerStats.clear();
    }

    /**
     * Initialize statistics for a worker
     * @param {number} workerId - Worker identifier
     */
    initializeWorkerStats(workerId) {
        this.workerStats.set(workerId, {
            isActive: true,
            startTime: Date.now(),
            filesProcessed: 0,
            batchesProcessed: 0,
            successfulOperations: 0,
            failedOperations: 0,
            processingTimeMs: 0,
            contextSwitches: 0,
            reposCompleted: 0,
            errorMessages: [],
            endTime: null,
            totalTime: 0
        });
    }

    /**
     * Update worker statistics
     * @param {number} workerId - Worker identifier
     * @param {string} metric - Metric name
     * @param {any} value - Value to add/update
     */
    updateWorkerStats(workerId, metric, value) {
        const stats = this.workerStats.get(workerId);
        if (!stats) return;

        if (Array.isArray(stats[metric])) {
            stats[metric].push(value);
        } else if (typeof stats[metric] === 'number') {
            stats[metric] += value;
        } else {
            stats[metric] = value;
        }
    }

    /**
     * Finalize worker statistics
     * @param {number} workerId - Worker identifier
     * @param {number} totalTime - Total processing time
     */
    finalizeWorkerStats(workerId, totalTime) {
        const stats = this.workerStats.get(workerId);
        if (!stats) return;

        stats.isActive = false;
        stats.endTime = Date.now();
        stats.totalTime = totalTime;
    }

    /**
     * Calculate average processing time across workers
     * @param {Array} workerStats - Worker statistics array
     * @returns {number} Average processing time
     */
    calculateAverageProcessingTime(workerStats) {
        const workersWithTime = workerStats.filter(w => w.processingTimeMs > 0 && w.successfulOperations > 0);
        if (workersWithTime.length === 0) return 0;

        const totalTime = workersWithTime.reduce((sum, w) => sum + w.processingTimeMs, 0);
        const totalOperations = workersWithTime.reduce((sum, w) => sum + w.successfulOperations, 0);

        return totalOperations > 0 ? Math.round(totalTime / totalOperations) : 0;
    }

    /**
     * Calculate error rate across workers
     * @param {Array} workerStats - Worker statistics array
     * @returns {number} Error rate percentage
     */
    calculateErrorRate(workerStats) {
        const totalOperations = workerStats.reduce((sum, w) => sum + w.successfulOperations + w.failedOperations, 0);
        const totalErrors = workerStats.reduce((sum, w) => sum + w.failedOperations, 0);

        return totalOperations > 0 ? Math.round((totalErrors / totalOperations) * 100) : 0;
    }

    /**
     * Get memory usage estimate
     * @returns {Object} Memory usage information
     */
    getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return { used: 0, total: 0, limit: 0 };
    }

    /**
     * Get system uptime
     * @returns {number} Uptime in milliseconds
     */
    getUptime() {
        return Date.now() - (window?.performance?.timing?.navigationStart || Date.now());
    }

    /**
     * Check if any worker is overloaded
     * @returns {boolean} True if any worker is overloaded
     */
    isAnyWorkerOverloaded() {
        const healthStatus = this.getHealthStatus();
        return healthStatus.workerHealth.errorRate > 20; // 20% error rate threshold
    }

    /**
     * Get worker performance summary
     * @returns {Object} Performance summary
     */
    getPerformanceSummary() {
        const healthStatus = this.getHealthStatus();
        const workerStats = this.getWorkerStats();

        return {
            overall: healthStatus,
            workers: workerStats,
            recommendations: this.generateRecommendations(healthStatus, workerStats)
        };
    }

    /**
     * Generate performance recommendations
     * @param {Object} healthStatus - Health status
     * @param {Array} workerStats - Worker statistics
     * @returns {Array} Recommendations
     */
    generateRecommendations(healthStatus, workerStats) {
        const recommendations = [];

        if (healthStatus.workerHealth.errorRate > 10) {
            recommendations.push("High error rate detected. Check AI service connectivity and rate limits.");
        }

        if (healthStatus.workerHealth.averageProcessingTime > 10000) { // 10 seconds
            recommendations.push("Slow processing detected. Consider reducing batch sizes or increasing worker count.");
        }

        if (healthStatus.systemHealth.memoryUsage.used / healthStatus.systemHealth.memoryUsage.limit > 0.8) {
            recommendations.push("High memory usage detected. Consider restarting the application.");
        }

        return recommendations;
    }

    /**
     * Broadcast current status to monitoring dashboard
     */
    broadcastStatus() {
        if (!this.channel) return;

        const health = this.getHealthStatus();
        const workerStats = this.getWorkerStats();

        // Transform worker stats for dashboard
        const workers = workerStats.map(w => ({
            id: w.workerId,
            status: w.isActive ? 'PROCESSING' : (w.errorMessages.length > 0 ? 'ERROR' : 'IDLE'),
            repo: 'active-repo', // We might need to track this better if needed
            file: w.isActive ? 'processing...' : '--', // Simplify for now or pass actual current file
            duration: w.isActive ? (Date.now() - w.startTime) : 0,
            stats: {
                success: w.successfulOperations,
                failed: w.failedOperations
            }
        }));

        // Get recent logs (This would require integration with Logger, for now sending mock/empty)
        // In a real implementation, Logger would have a 'getRecent()' method.
        const logs = [];

        const payload = {
            type: 'STATUS_UPDATE',
            timestamp: Date.now(),
            system: {
                uptime: health.systemHealth.uptime,
                memory: health.systemHealth.memoryUsage
            },
            queue: {
                total: health.queueHealth.totalQueued + health.queueHealth.totalProcessed,
                processed: health.queueHealth.totalProcessed,
                pending: health.queueHealth.totalQueued,
                percent: health.queueHealth.completionRate
            },
            workers: workers,
            logs: logs
        };

        this.channel.postMessage(payload);
    }
}
