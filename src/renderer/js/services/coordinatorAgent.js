/**
 * CoordinatorAgent - Orchestrates workers and verifies analysis completion
 * Maintains inventory of repos/files and assigns tasks to workers
 */
import { logManager } from '../utils/logManager.js';
import { InventoryManager, ProgressReporter } from './coordinator/index.js';

export class CoordinatorAgent {
    constructor() {
        this.logger = logManager.child({ component: 'CoordinatorAgent' });
        this.inventoryManager = new InventoryManager();
        this.reporter = new ProgressReporter();
        this.workerCount = 4;
        this.onRepoComplete = null;
        this.completedRepos = new Set();
        this.perfStats = { totalAiMs: 0, count: 0, slowestFile: { path: '', ms: 0 } };
        this.aiOnlyStats = { totalAiMs: 0, count: 0, avgAiMs: 0 }; // TELEMETRY SPLIT: Real AI metrics only
    }

    get inventory() { return this.inventoryManager.data; }

    set onProgress(callback) { this.reporter.onProgress = callback; }

    initInventory(repos) {
        this.inventoryManager.init(repos);
        this.reporter.report('Inventory initialized', `${repos.length} repos detected`, this.inventory);
    }

    registerRepoFiles(repoName, tree, treeSha, maxFiles = 9999) {
        this.inventoryManager.registerFiles(repoName, tree, treeSha, maxFiles);
        this.reporter.report('Repo scanned', `${repoName}: ${tree.length} files (Capped at ${maxFiles})`, this.inventory);
    }

    getNextBatch(batchSize = 5, ignorePriority = false) {
        return this.inventoryManager.getNextBatch(batchSize, ignorePriority);
    }

    markCompleted(repoName, filePath, summary, rawData = null) {
        this.inventoryManager.markCompleted(repoName, filePath, summary, rawData);

        // REAL-TIME PERFORMANCE ACCUMULATION
        if (rawData && typeof rawData.durationMs === 'number') {
            this.perfStats.totalAiMs += rawData.durationMs;
            this.perfStats.count++;
            if (rawData.durationMs > this.perfStats.slowestFile.ms) {
                this.perfStats.slowestFile = { path: filePath, ms: rawData.durationMs };
            }

            // TELEMETRY SPLIT: Only count REAL AI workers (durationMs > 0)
            if (rawData.durationMs > 0) {
                this.aiOnlyStats.totalAiMs += rawData.durationMs;
                this.aiOnlyStats.count++;
                this.aiOnlyStats.avgAiMs = Math.round(this.aiOnlyStats.totalAiMs / this.aiOnlyStats.count);
            }
        }

        const stats = this.inventoryManager.getStats();
        this.reporter.report('Progress', `Analyzing... ${stats.analyzed}/${stats.totalFiles}`, this.inventory, { percent: stats.progress });

        // STREAMING HOOK: Check if this repo is fully done
        const isDone = this.inventoryManager.isRepoComplete(repoName);

        // STREAMING EVOLUTION: Partial Batch Trigger (Every 3 files)
        if (!this.repoProgress) this.repoProgress = {};
        if (!this.repoProgress[repoName]) this.repoProgress[repoName] = 0;
        this.repoProgress[repoName]++;

        // Fire partial event every 3 files (Threshold)
        if (this.repoProgress[repoName] > 0 && this.repoProgress[repoName] % 3 === 0) {
            if (this.onRepoBatchReady) {
                this.logger.info(`🌊 PARTIAL BATCH: ${repoName} (${this.repoProgress[repoName]} files)`);
                this.onRepoBatchReady(repoName);
            }
        }

        if (isDone) {
            if (!this.completedRepos.has(repoName)) {
                this.completedRepos.add(repoName);
                if (this.onRepoComplete) this.onRepoComplete(repoName);
            }
        }
    }

    markFailed(repoName, filePath, error) {
        this.inventoryManager.markFailed(repoName, filePath, error);

        const stats = this.inventoryManager.getStats();
        this.reporter.report('Progress', `Analyzing... ${stats.analyzed}/${stats.totalFiles}`, this.inventory, { percent: stats.progress });

        // STREAMING HOOK: Check if this repo is fully done (even with failure)
        if (this.inventoryManager.isRepoComplete(repoName)) {
            if (!this.completedRepos.has(repoName)) {
                this.completedRepos.add(repoName);
                if (this.onRepoComplete) this.onRepoComplete(repoName);
            }
        }
    }

    isComplete() {
        return this.inventoryManager.data.analyzedFiles >= this.inventoryManager.data.totalFiles;
    }

    getStats() {
        const stats = this.inventoryManager.getStats();

        stats.performance = {
            totalAiMs: this.perfStats.totalAiMs,
            avgAiMs: this.perfStats.count > 0 ? Math.round(this.perfStats.totalAiMs / this.perfStats.count) : 0,
            slowestFile: this.perfStats.slowestFile,
            // TELEMETRY SPLIT: Clean metrics (real AI only)
            realAiAvgMs: this.aiOnlyStats.avgAiMs,
            realAiCount: this.aiOnlyStats.count
        };

        return stats;
    }

    /**
     * Gets filtered summaries for chat (Top 10 per repo to save context)
     */
    getSummaryForChat() {
        return this.getSummaryByFilter({ limitPerRepo: 10, minPriority: 60 });
    }

    /**
     * Gets 100% of worker summaries (No filters)
     */
    getAllSummaries() {
        return this.getSummaryByFilter({ limitPerRepo: 9999, minPriority: 0 });
    }

    /**
     * Reconstructs raw findings for Deep Curator
     */
    getAllRichSummaries() {
        const findings = [];
        for (const repo of this.inventory.repos) {
            const completed = repo.files.filter(f => f.status === 'completed');
            completed.forEach(f => {
                if (f.rawData) {
                    findings.push({ repo: repo.name, file: f.path, ...f.rawData });
                } else if (f.summary) {
                    findings.push({
                        repo: repo.name,
                        file: f.path,
                        tool: 'analysis',
                        params: { insight: f.summary.substring(0, 200), impact: 'Unknown' }
                    });
                }
            });
        }
        return findings;
    }

    /**
     * Generic summary extraction engine
     */
    getSummaryByFilter({ limitPerRepo, minPriority }) {
        const summaries = [];
        for (const repo of this.inventory.repos) {
            const completed = repo.files.filter(f =>
                f.status === 'completed' && f.summary && f.priority >= minPriority
            );

            if (completed.length > 0) {
                const sorted = [...completed].sort((a, b) => b.priority - a.priority);
                summaries.push(`--- REPO: ${repo.name} ---`);
                const topFiles = sorted.slice(0, limitPerRepo);
                topFiles.forEach(f => summaries.push(`[${f.path}]: ${f.summary}`));
            }
        }
        return summaries.join('\n');
    }
}
