/**
 * BackgroundAnalyzer - Background analysis
 * Extracted from ProfileAnalyzer to comply with SRP
 * UPDATED: Uses centralized Logger and CacheRepository
 */
import { AIService } from './aiService.js';
import { DeepCurator } from './deepCurator.js';
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';

import { DebugLogger } from '../utils/debugLogger.js';
import { FileClassifier } from '../utils/fileClassifier.js';
import { AISlotPriorities } from './ai/AISlotManager.js';

export class BackgroundAnalyzer {
    constructor(coordinator, deepCurator = null, debugLogger = null) {
        this.coordinator = coordinator;
        this.deepCurator = deepCurator || new DeepCurator();
        this.debugLogger = debugLogger || DebugLogger; // INJECTION
    }

    /**
     * Background analysis - keeps learning while the user works
     * Returns Promise so tests can wait for it
     */
    async startBackgroundAnalysis(username, findings, onProgress) {
        // PERFORMANCE: If in Tracer mode (10x10), skip background analysis to be fast
        if (typeof window !== 'undefined' && window.IS_TRACER) {
            Logger.info('BACKGROUND', 'Skipping background analysis (Tracer Limit Active)');
            return null;
        }
        if (window.AI_OFFLINE) return null; // CRITICAL: Stop here if offline
        Logger.background('Starting deep background analysis...');

        // Small pause to avoid blocking initial render
        await new Promise(r => setTimeout(r, 100));

        // Get pending files from coordinator
        const pendingBatches = [];
        let batch;
        // STABILITY FIX: Reduced batch from 20 to 2 to prevent AI Server Saturation
        while ((batch = this.coordinator.getNextBatch(5, true)).length > 0) { // Increased to 5
            pendingBatches.push(batch);
        }

        if (pendingBatches.length === 0) {
            Logger.success('BACKGROUND', 'No pending files. Full coverage.');
            return null;
        }

        // Process all pending batches
        for (const fileBatch of pendingBatches) {
            // SILENCE & PAUSE: If AI is offline, wait or stop logging
            if (window.AI_OFFLINE) {
                console.log("[Background] Brain disconnected. Fast-forwarding logs to silence...");
                await new Promise(r => setTimeout(r, 2000)); // Sleep 2s and check again
                continue;
            }

            await Promise.all(fileBatch.map(async (fileInfo) => {
                try {
                    // Check cache
                    const cached = await CacheRepository.getFileSummary(username, fileInfo.repo, fileInfo.path);
                    if (cached) {
                        this.coordinator.markCompleted(fileInfo.repo, fileInfo.path, cached.summary);
                        return;
                    }

                    // Download file
                    const contentRes = await window.githubAPI.getFileContent(username, fileInfo.repo, fileInfo.path);
                    if (contentRes && contentRes.content) {
                        const rawContent = atob(contentRes.content.replace(/\n/g, ''));
                        const snippet = rawContent.substring(0, 2000);

                        // PRE-FILTER: Use FileClassifier instead of inline logic
                        const skipCheck = FileClassifier.shouldSkip(fileInfo.path, snippet);
                        if (skipCheck.skip) {
                            this.coordinator.markCompleted(fileInfo.repo, fileInfo.path, `SKIP: ${skipCheck.reason}`);
                            this.debugLogger.logWorker('BACKGROUND', {
                                input: { repo: fileInfo.repo, path: fileInfo.path },
                                prompt: 'PRE-FILTERED',
                                output: `SKIP: ${skipCheck.reason}`
                            });
                            return;
                        }

                        // HIGH FIDELITY ANALYSIS
                        let aiSummary = `Code in ${fileInfo.repo}`;
                        try {
                            aiSummary = await this.deepCurator.generateHighFidelitySummary(fileInfo.repo, fileInfo.path, snippet, AISlotPriorities.BACKGROUND);
                        } catch (err) {
                            console.warn("AI Fidelity Error:", err);
                        }

                        await CacheRepository.setFileSummary(
                            username, fileInfo.repo, fileInfo.path,
                            contentRes.sha, aiSummary, snippet
                        );

                        this.coordinator.markCompleted(fileInfo.repo, fileInfo.path, aiSummary);

                        // AUDIT LOGGING: Persist finding to background worker JSONL
                        CacheRepository.appendWorkerLog('BACKGROUND', {
                            timestamp: new Date().toISOString(),
                            repo: fileInfo.repo,
                            path: fileInfo.path,
                            summary: aiSummary,
                            classification: "BACKGROUND_ANALYSIS"
                        });

                        // LOGGING: Capture background worker results
                        // Use constant ID to avoid filesystem errors with paths
                        this.debugLogger.logWorker('BACKGROUND', {
                            input: { repo: fileInfo.repo, path: fileInfo.path },
                            prompt: "BACKGROUND_FIDELITY_GENERATION",
                            output: aiSummary
                        });

                    }
                } catch (e) {
                    this.coordinator.markFailed(fileInfo.repo, fileInfo.path, e.message);
                }
            }));

            // Small pause between batches to avoid saturation
            await new Promise(r => setTimeout(r, 50));
        }

        const finalStats = this.coordinator.getStats();
        Logger.success('BACKGROUND', `Analysis complete: ${finalStats.analyzed}/${finalStats.totalFiles} (${finalStats.progress}%)`);

        return null; // Deep curation is now managed by ProfileAnalyzer heartbeat
    }
}
