/**
 * BackgroundAnalyzer - Background analysis
 * Extracted from ProfileAnalyzer to comply with SRP
 * UPDATED: Uses centralized Logger and CacheRepository
 */
import { AIService } from './aiService.js';
import { DeepCurator } from './deepCurator.js';
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';

export class BackgroundAnalyzer {
    constructor(coordinator, deepCurator = null) {
        this.coordinator = coordinator;
        this.deepCurator = deepCurator || new DeepCurator();
    }

    /**
     * Background analysis - keeps learning while the user works
     * Returns Promise so tests can wait for it
     */
    async startBackgroundAnalysis(username, initialFindings, onStep = null) {
        if (window.AI_OFFLINE) return null; // CRITICAL: Stop here if offline
        Logger.background('Starting deep background analysis...');

        // Small pause to avoid blocking initial render
        await new Promise(r => setTimeout(r, 100));

        // Get pending files from coordinator
        const pendingBatches = [];
        let batch;
        while ((batch = this.coordinator.getNextBatch(20, true)).length > 0) {
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

                        // HIGH FIDELITY ANALYSIS
                        let aiSummary = `Code in ${fileInfo.repo}`;
                        try {
                            aiSummary = await this.deepCurator.generateHighFidelitySummary(fileInfo.repo, fileInfo.path, snippet);
                        } catch (err) {
                            console.warn("AI Fidelity Error:", err);
                        }

                        // Save in cache with REAL summary
                        await CacheRepository.setFileSummary(
                            username, fileInfo.repo, fileInfo.path,
                            contentRes.sha, aiSummary, snippet
                        );

                        this.coordinator.markCompleted(fileInfo.repo, fileInfo.path, aiSummary);
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
        Logger.dna('Refreshing Art Director memory with deep knowledge...');

        // Deep Curation (Map-Reduce)
        Logger.dna(`Starting Deep Curation (Map-Reduce) of ${finalStats.totalFiles} files...`);

        const deepMemory = await this.deepCurator.runDeepCurator(username, this.coordinator);

        // Persistence: Save new DNA in cache
        const saved = await CacheRepository.setDeveloperDNA(username, deepMemory);
        if (saved) {
            Logger.metabolic(`DNA updated and persisted for ${username}.`);
        }

        if (onStep) {
            onStep({
                type: 'DeepMemoryReady',
                message: '🧠 Deep memory synchronized.',
                data: deepMemory
            });
        }

        return deepMemory;
    }
}
