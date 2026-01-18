/**
 * BatchProcessor - Handles complex batch processing and data normalization
 * Extracted from ProfileAnalyzer to comply with SRP
 *
 * SOLID Principles:
 * - S: Only processes batches and normalizes data
 * - O: Extensible processing strategies
 * - L: N/A
 * - I: Clean interface for batch operations
 * - D: Depends on injected components (memory manager, curator, etc.)
 */

import { Logger } from '../../utils/logger.js';
import { memoryManager } from '../memory/MemoryManager.js';
import { ReactionEngine } from './ReactionEngine.js';

export class BatchProcessor {
    constructor(deepCurator, intelligenceSynthesizer) {
        this.deepCurator = deepCurator;
        this.intelligenceSynthesizer = intelligenceSynthesizer;
    }

    /**
     * Set up worker batch processing listeners
     */
    setupWorkerListeners(workerPool, username, onStep) {
        workerPool.onProgress = (data) => {
            if (onStep) onStep({ type: 'Progreso', percent: data.percent, message: `🤖 Worker ${data.workerId}: Processed` });
        };

        console.log("BatchProcessor: Listener Attached (onBatchComplete)");
        // Listen for batch completion (Concurrent)
        workerPool.onBatchComplete = async (batch) => {
            console.log(`BatchProcessor: onBatchComplete RECV batch=${batch ? batch.length : 'null'}`);
            await this.processBatch(batch, username, onStep);
        };

        // Set up external listener callback
        this.onBatchComplete = null;
    }

    /**
     * Process a completed batch from workers
     */
    async processBatch(batch, username, onStep) {
        // EMERGENCY FIX: Reconstruct objects to ensure validity (Ghost Object Protocol)
        // We create FRESH objects to bypass any immutability or reference issues
        const fixedBatch = batch.map(f => this.normalizeFinding(f));

        // Log first item to verify resurrection
        if (fixedBatch.length > 0) {
            console.log(`[BatchProcessor] Resurrected Batch: Size=${fixedBatch.length}, Item0 Summary=${!!fixedBatch[0].summary}, Path=${fixedBatch[0].path}`);
        }

        // CRITICAL: Pass to Curator FIRST to avoid any mutation by MemoryManager
        const stats = this.deepCurator.incorporateBatch(fixedBatch);

        // Persist to Graph Memory (Async)
        // Use for...of to ensure we await the async storeFinding
        for (const finding of fixedBatch) {
            const node = await memoryManager.storeFinding(finding);
            // Attach the UID to the finding for later curation linking
            finding.uid = node.uid;
        }

        const reflection = this.intelligenceSynthesizer.synthesizeBatch(stats);
        if (reflection.isSignificant) {
            Logger.success('ANALYZER', `💡 Intermediate Evolution: ${reflection.snapshot}`);
            if (onStep) onStep({ type: 'DeepMemoryReady', message: `🧠 ${reflection.snapshot}`, data: null });

            ReactionEngine.trigger(username, reflection.snapshot, 'system');
        }

        // TELEMETRY: Trace total findings count vs coordinator
        const totalInCurator = this.deepCurator.streamingHandler.getAccumulatedFindings().length;
        console.log(`[BatchProcessor] Sync Status: Tracer(${totalInCurator}) findings processed.`);

        // NOTIFY EXTERNAL LISTENERS (Tracer, UI, etc)
        if (this.onBatchComplete && typeof this.onBatchComplete === 'function') {
            await this.onBatchComplete(fixedBatch);
        }
    }

    /**
     * Normalize a finding object to ensure validity
     */
    normalizeFinding(finding) {
        const safePath = finding.path || finding.file || 'unknown';
        const safeSummary = finding.summary || (finding.content ? `Analyzed content (${finding.content.length} chars)` : "No Summary Available (Resurrected)");

        return {
            repo: finding.repo,
            path: safePath,
            file: safePath,
            summary: safeSummary,
            workerId: finding.workerId || 999,
            classification: finding.classification || 'General',
            uid: finding.uid,
            file_meta: finding.file_meta || {},
            metadata: finding.metadata || {},
            params: finding.params || {}
        };
    }

    /**
     * Set external batch complete callback
     */
    setOnBatchComplete(callback) {
        this.onBatchComplete = callback;
    }
}
