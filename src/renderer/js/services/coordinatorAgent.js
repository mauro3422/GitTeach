/**
 * CoordinatorAgent - Orchestrates workers and verifies analysis completion
 * Maintains inventory of repos/files and assigns tasks to workers
 */
import { InventoryManager, ProgressReporter } from './coordinator/index.js';

export class CoordinatorAgent {
    constructor() {
        this.inventoryManager = new InventoryManager();
        this.reporter = new ProgressReporter();
        this.workerCount = 4;
    }

    get inventory() { return this.inventoryManager.data; }

    set onProgress(callback) { this.reporter.onProgress = callback; }

    initInventory(repos) {
        this.inventoryManager.init(repos);
        this.reporter.report('Inventory initialized', `${repos.length} repos detected`, this.inventory);
    }

    registerRepoFiles(repoName, tree, treeSha) {
        this.inventoryManager.registerFiles(repoName, tree, treeSha);
        this.reporter.report('Repo scanned', `${repoName}: ${tree.length} files`, this.inventory);
    }

    getNextBatch(batchSize = 5, ignorePriority = false) {
        return this.inventoryManager.getNextBatch(batchSize, ignorePriority);
    }

    markCompleted(repoName, filePath, summary, rawData = null) {
        this.inventoryManager.markCompleted(repoName, filePath, summary, rawData);

        const stats = this.inventoryManager.getStats();
        this.reporter.report('Progress', `Analyzing... ${stats.analyzed}/${stats.totalFiles}`, this.inventory, { percent: stats.progress });
    }

    markFailed(repoName, filePath, error) {
        this.inventoryManager.markFailed(repoName, filePath, error);

        const stats = this.inventoryManager.getStats();
        this.reporter.report('Progress', `Analyzing... ${stats.analyzed}/${stats.totalFiles}`, this.inventory, { percent: stats.progress });
    }

    isComplete() {
        return this.inventoryManager.data.analyzedFiles >= this.inventoryManager.data.totalFiles;
    }

    getStats() {
        return this.inventoryManager.getStats();
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
                        params: { insight: f.summary.substring(0, 50) + '...', impact: 'Unknown' }
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
