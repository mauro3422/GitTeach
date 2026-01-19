/**
 * ResultProcessor - Handles AI result processing and response handling
 * Extracted from AIWorkerPool to comply with SRP
 *
 * Responsibilities:
 * - Process successful AI responses
 * - Handle processing errors and failures
 * - Coordinate with coordinator for result updates
 * - Manage batch buffering and streaming
 * - Log worker audit trails
 */
import { logManager } from '../../utils/logManager.js';
import { CacheRepository } from '../../utils/cacheRepository.js';

// Environment check
const isNode = typeof process !== 'undefined' && process.versions?.node;

export class ResultProcessor {
    constructor(queueManager, contextManager, promptBuilder, debugLogger) {
        this.queueManager = queueManager;
        this.contextManager = contextManager;
        this.promptBuilder = promptBuilder;
        this.debugLogger = debugLogger;
        this.logger = logManager.child({ component: 'ResultProcessor' });
    }

    /**
     * Call AI to summarize a file or batch
     * @param {Object} aiService - AI service instance
     * @param {Object} input - Input item (single or batch)
     * @returns {Promise<Object>} { prompt, summary, langCheck }
     */
    async summarizeWithAI(aiService, input) {
        const systemPrompt = this.promptBuilder.buildSystemPrompt();
        const { prompt: userPrompt, skipReason, langCheck } = this.promptBuilder.buildUserPrompt(input);

        // Pre-filtered
        if (skipReason) {
            this.logger.debug(`SKIPPING ${input.path || 'Batch'}: ${skipReason}`);
            return { prompt: 'PRE-FILTERED', summary: `SKIP: ${skipReason}`, langCheck: { valid: true } };
        }

        // SHA DEDUPLICATION: Check if we already analyzed this content in this session
        if (!input.isBatch && input.sha) {
            const sessionCache = this.queueManager.processedShas.get(input.sha);
            if (sessionCache) {
                this.logger.debug(`CACHE HIT ${input.path}`);
                return { prompt: 'SESSION_CACHE_HIT', summary: sessionCache, langCheck: { valid: true } };
            }
        }

        // Use priority from input item, default to NORMAL if missing
        const isBatch = input.isBatch;
        const priority = isBatch ? (input.items[0].priority || 1) : (input.priority || 1);

        // Use temperature 0.0 and JSON schema for high-fidelity extraction (LFM2 Optimization)
        let summary;
        let summarizeAttempt = 0;
        const maxSummarizeRetries = 2;

        while (summarizeAttempt < maxSummarizeRetries) {
            try {
                summary = await aiService.callAI(
                    systemPrompt,
                    userPrompt,
                    0.0, // Forced cold temperature
                    'json_object',
                    this.promptBuilder.getResponseSchema(),
                    priority
                );
                break; // Success
            } catch (err) {
                if (err.message.includes('Circuit Breaker OPEN')) {
                    this.logger.warn(`Circuit Breaker OPEN. Waiting 10s before retry ${summarizeAttempt + 1}...`);
                    await new Promise(r => setTimeout(r, 10000));
                }
                summarizeAttempt++;
                if (summarizeAttempt >= maxSummarizeRetries) throw err;
            }
        }


        // FORENSIC DEBUG: Log to structured logging
        this.logger.debug(`AI Response received for ${input.path || 'BATCH'}`, {
            length: summary?.length,
            isBatch
        });

        // Local FS forensic log (kept for ultra-detailed debugging in dev/tracer)
        if (isNode) {
            try {
                // Use dynamic import to avoid bundler issues in browser
                const fs = await import('fs');
                const path = await import('path');
                const logPath = path.join(process.cwd(), 'raw_worker_outputs.log');
                const logEntry = `\n\n=== [${new Date().toISOString()}] Input: ${input.isBatch ? 'BATCH' : input.path} ===\n${summary}\n================================================`;
                fs.appendFileSync(logPath, logEntry);
            } catch (e) {
                this.logger.error("Forensic Log Error:", { error: e.message });
            }
        }

        return {
            prompt: `${systemPrompt}\n\n${userPrompt}`,
            summary,
            langCheck: langCheck || { valid: true }
        };
    }

    /**
     * Process successful results
     * @param {number} workerId - Worker identifier
     * @param {Array} items - Processed items
     * @param {string} summary - AI summary
     * @param {Object} parsed - Parsed AI response
     * @param {Object} aiService - AI service instance
     * @param {string} prompt - Used prompt
     * @param {boolean} isBatch - Whether batch processing
     * @param {string} claimedRepo - Repository being processed
     * @param {number} durationMs - Processing duration
     */
    async processResults(workerId, items, summary, parsed, aiService, prompt, isBatch, claimedRepo, durationMs = 0) {
        const results = [];
        const batchBuffer = [];

        items.forEach(item => {
            item.status = 'completed';
            item.summary = summary;

            // Default valid summary if undefined
            const safeSummary = summary || "Analyzed (No Summary)";

            const resultItem = {
                repo: item.repo,
                path: item.path,
                summary: safeSummary,
                workerId: workerId || 999,
                classification: parsed?.params?.technical_strength || 'General',
                metadata: parsed?.params?.metadata || parsed || {}, // Fallback to full parsed if metadata missing
                tags: [
                    ...(parsed?.params?.logic?.patterns || []),
                    ...(parsed?.params?.semantic?.dependencies?.frameworks || []),
                    ...(parsed?.params?.professional?.ecosystem?.ci_cd || []),
                    ...(parsed?.params?.domain ? [parsed.params.domain] : [])
                ],
                params: parsed?.params || { insight: safeSummary, technical_strength: 'General' },
                file_meta: item.file_meta || {},
                durationMs: durationMs || 1
            };

            // Critical Debug
            if (!summary) this.logger.warn(`Summary missing for ${item.path}`);

            results.push(resultItem);
            batchBuffer.push(resultItem); // BRIDGE TO MEMORY SYSTEM V3

            // FEED COORDINATOR: Replace the "Downloaded" summary with the "Analyzed" rich finding
            // Note: Coordinator injection handled by parent class

            // Add to repo context for future files
            this.contextManager.addToRepoContext(item.repo, item.path, summary, aiService);

            // Audit logging
            CacheRepository.appendWorkerLog(workerId, {
                timestamp: new Date().toISOString(),
                repo: item.repo,
                path: item.path,
                summary: summary,
                classification: parsed?.params?.technical_strength || 'General',
                file_meta: item.file_meta || {}, // NEW: Persist meta in logs
                durationMs: durationMs
            });
        });

        // Debug logging
        if (!this.debugLogger.isActive()) {
            this.logger.warn(`DebugLogger INACTIVE. Enabled: ${this.debugLogger.enabled}, Session: ${this.debugLogger.sessionPath}`);
        }

        this.debugLogger.logWorker(workerId, {
            input: isBatch ? { repo: claimedRepo, paths: items.map(i => i.path) } : { repo: items[0].repo, path: items[0].path, contentLength: items[0].content?.length },
            prompt: prompt,
            output: summary,
            durationMs: durationMs
        });

        // Update progress and cleanup keys
        this.queueManager.markProcessed(items);

        return {
            results,
            batchBuffer
        };
    }

    /**
     * Handle processing errors
     * @param {number} workerId - Worker identifier
     * @param {Array} items - Failed items
     * @param {Error} error - Processing error
     * @param {boolean} isBatch - Whether batch processing
     * @param {string} claimedRepo - Repository being processed
     */
    handleError(workerId, items, error, isBatch, claimedRepo) {
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

        this.logger.error(`Worker ${workerId} error: ${error.message}`);
    }

    /**
     * Create result item from processed data
     * @param {Object} item - Original item
     * @param {string} summary - AI summary
     * @param {Object} parsed - Parsed response
     * @param {number} workerId - Worker identifier
     * @param {number} durationMs - Processing duration
     * @returns {Object} Result item
     */
    createResultItem(item, summary, parsed, workerId, durationMs) {
        return {
            repo: item.repo,
            path: item.path,
            summary: summary,
            workerId: workerId,
            classification: parsed?.params?.technical_strength || 'General',
            metadata: parsed?.params?.metadata || {},
            params: parsed?.params || { insight: summary, technical_strength: 'General' },
            file_meta: item.file_meta || {},
            durationMs: durationMs
        };
    }

    /**
     * Post-process summary with anomaly tagging
     * @param {string} summary - AI response
     * @param {Object} langCheck - Language integrity check result
     * @returns {string} Processed summary
     */
    postProcessSummary(summary, langCheck) {
        return this.promptBuilder.postProcessSummary(summary, langCheck);
    }

    /**
     * Check if response indicates file should be skipped
     * @param {string} response - Raw response
     * @returns {boolean} True if should skip
     */
    shouldSkip(response) {
        return this.promptBuilder.shouldSkip(response);
    }

    /**
     * Validate processing result
     * @param {Object} result - Processing result
     * @returns {boolean} True if valid
     */
    validateResult(result) {
        return result && result.repo && result.path && result.summary;
    }

    /**
     * Get processing statistics
     * @returns {Object} Processing stats
     */
    getProcessingStats() {
        return {
            queueStats: this.queueManager.getStats(),
            contextStats: this.contextManager.getStats()
        };
    }
}
