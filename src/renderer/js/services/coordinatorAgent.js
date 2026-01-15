/**
 * CoordinatorAgent - Orchestrates workers and verifies analysis completion
 * Maintains inventory of repos/files and assigns tasks to workers
 * UPDATED: Uses centralized Logger
 */
import { Logger } from '../utils/logger.js';

export class CoordinatorAgent {
    constructor() {
        this.inventory = {
            repos: [],
            totalFiles: 0,
            analyzedFiles: 0,
            pendingFiles: [],
            completedFiles: [],
            failedFiles: []
        };
        this.onProgress = null;
        this.workerCount = 4; // Parallel workers
    }

    /**
     * Initializes inventory with repo list
     */
    initInventory(repos) {
        this.inventory.repos = repos.map(r => ({
            name: r.name,
            fullName: r.full_name,
            language: r.language,
            files: [],
            status: 'pending',
            treeSha: null
        }));
        this.report('Inventory initialized', `${repos.length} repos detected`);
    }

    /**
     * Registers files from a repo
     */
    registerRepoFiles(repoName, tree, treeSha) {
        const repo = this.inventory.repos.find(r => r.name === repoName);
        if (!repo) return;

        repo.treeSha = treeSha;
        repo.files = tree.map(node => ({
            path: node.path,
            sha: node.sha,
            size: node.size,
            type: node.type,
            status: 'pending',
            priority: this.calculatePriority(node.path)
        }));

        // Sort by priority (important files first)
        repo.files.sort((a, b) => b.priority - a.priority);

        this.inventory.totalFiles += repo.files.filter(f => f.type === 'blob').length;
        this.report('Repo scanned', `${repoName}: ${repo.files.length} files`);
    }

    /**
     * Calculates file priority (higher = more important)
     */
    calculatePriority(filePath) {
        const lowerPath = filePath.toLowerCase();

        // High priority files
        if (lowerPath.includes('readme')) return 100;
        if (lowerPath.includes('package.json')) return 95;
        if (lowerPath.includes('cargo.toml')) return 95;
        if (lowerPath.includes('requirements.txt')) return 95;
        if (lowerPath.includes('go.mod')) return 95;
        if (lowerPath.includes('main.')) return 90;
        if (lowerPath.includes('index.')) return 90;
        if (lowerPath.includes('app.')) return 85;
        if (lowerPath.includes('changelog')) return 80;
        if (lowerPath.includes('config')) return 75;

        // Code files
        if (lowerPath.endsWith('.py')) return 60;
        if (lowerPath.endsWith('.js')) return 60;
        if (lowerPath.endsWith('.ts')) return 60;
        if (lowerPath.endsWith('.cpp') || lowerPath.endsWith('.c')) return 60;
        if (lowerPath.endsWith('.rs')) return 60;
        if (lowerPath.endsWith('.go')) return 60;

        // Documentation
        if (lowerPath.endsWith('.md')) return 50;

        // Configuration
        if (lowerPath.endsWith('.json')) return 40;
        if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) return 40;

        // Lower priority
        if (lowerPath.includes('node_modules')) return 0;
        if (lowerPath.includes('.lock')) return 5;
        if (lowerPath.includes('dist/')) return 5;

        return 30; // Default
    }

    /**
     * Gets next files to process for a worker
     */
    getNextBatch(batchSize = 5, ignorePriority = false) {
        const batch = [];

        for (const repo of this.inventory.repos) {
            const pendingFiles = repo.files.filter(f =>
                f.status === 'pending' &&
                f.type === 'blob' &&
                (ignorePriority || f.priority > 10)
            );

            for (const file of pendingFiles) {
                if (batch.length >= batchSize) break;
                file.status = 'processing';
                batch.push({
                    repo: repo.name,
                    path: file.path,
                    sha: file.sha,
                    priority: file.priority
                });
            }
            if (batch.length >= batchSize) break;
        }

        return batch;
    }

    /**
     * Marks a file as completed
     */
    markCompleted(repoName, filePath, summary, rawData = null) {
        const repo = this.inventory.repos.find(r => r.name === repoName);
        if (!repo) return;

        const file = repo.files.find(f => f.path === filePath);
        if (file) {
            file.status = 'completed';
            file.summary = summary;
            file.rawData = rawData; // Store rich JSON data
            this.inventory.analyzedFiles++;
            this.inventory.completedFiles.push({ repo: repoName, path: filePath });
        }

        // Report progress
        const progress = this.inventory.totalFiles > 0
            ? Math.round((this.inventory.analyzedFiles / this.inventory.totalFiles) * 100)
            : 0;

        this.report('Progress', `Analyzing... ${this.inventory.analyzedFiles}/${this.inventory.totalFiles}`, { percent: progress });
    }

    /**
     * Marks a file as failed
     */
    markFailed(repoName, filePath, error) {
        const repo = this.inventory.repos.find(r => r.name === repoName);
        if (!repo) return;

        const file = repo.files.find(f => f.path === filePath);
        if (file) {
            file.status = 'failed';
            file.error = error;
            this.inventory.failedFiles.push({ repo: repoName, path: filePath, error });
            this.inventory.analyzedFiles++;
            // Report progress also on failure so the bar doesn't freeze
            const progress = this.inventory.totalFiles > 0
                ? Math.round((this.inventory.analyzedFiles / this.inventory.totalFiles) * 100)
                : 0;

            this.report('Progress', `Analyzing... ${this.inventory.analyzedFiles}/${this.inventory.totalFiles}`, { percent: progress });
        }
    }

    /**
     * Gets filtered summaries for chat (Top 10 per repo to save context)
     */
    getSummaryForChat() {
        return this.getSummaryByFilter({ limitPerRepo: 10, minPriority: 60 });
    }

    /**
     * Gets 100% of worker summaries (No filters)
     * Used for Deep Curation (Map-Reduce) in background.
     */
    getAllSummaries() {
        return this.getSummaryByFilter({ limitPerRepo: 9999, minPriority: 0 });
    }

    /**
     * Gets 100% of raw worker data objects (For Deep Curator)
     * FALLBACK: If rawData is missing, reconstructs it from summary to prevent Curator starvation.
     */
    getAllRichSummaries() {
        const findings = [];
        for (const repo of this.inventory.repos) {
            const completed = repo.files.filter(f => f.status === 'completed');
            completed.forEach(f => {
                if (f.rawData) {
                    findings.push({
                        repo: repo.name,
                        file: f.path,
                        ...f.rawData
                    });
                } else if (f.summary) {
                    // SHIM: Reconstruct object from flat text to save the cycle
                    findings.push({
                        repo: repo.name,
                        file: f.path,
                        tool: 'analysis',
                        params: {
                            insight: f.summary.substring(0, 50) + '...', // Best effort
                            technical_strength: 'Extracted from raw text',
                            impact: 'Unknown'
                        }
                    });
                }
            });
        }
        return findings;
    }

    /**
     * Generic summary extraction engine.
     */
    getSummaryByFilter({ limitPerRepo, minPriority }) {
        const summaries = [];
        for (const repo of this.inventory.repos) {
            const completed = repo.files.filter(f =>
                f.status === 'completed' &&
                f.summary &&
                f.priority >= minPriority
            );

            if (completed.length > 0) {
                const sorted = [...completed].sort((a, b) => b.priority - a.priority);
                summaries.push(`--- REPO: ${repo.name} ---`);
                const topFiles = sorted.slice(0, limitPerRepo);
                topFiles.forEach(f => {
                    summaries.push(`[${f.path}]: ${f.summary}`);
                });
            }
        }
        return summaries.join('\n');
    }

    /**
     * Checks if entire inventory was processed
     */
    isComplete() {
        return this.inventory.analyzedFiles >= this.inventory.totalFiles;
    }

    /**
     * Reports status (for logging/UI)
     */
    report(type, message, extra = {}) {
        // --- CORTAFUEGOS DE SILENCIO (v14.0) ---
        if (window.AI_OFFLINE) return;

        const log = `[Coordinator] ${type}: ${message}`;
        console.log(log);
        if (this.onProgress) {
            this.onProgress({ type, message, ...extra });
        }
        // Only log to terminal if NOT a progress update to avoid spam
        if (type !== 'Progress' && type !== 'Progreso') {
            Logger.info('Coordinator', `${type}: ${message}`);
        }
    }

    /**
     * Gets current statistics
     */
    getStats() {
        return {
            repos: this.inventory.repos.length,
            totalFiles: this.inventory.totalFiles,
            analyzed: this.inventory.analyzedFiles,
            pending: this.inventory.totalFiles - this.inventory.analyzedFiles,
            progress: this.inventory.totalFiles > 0
                ? Math.round((this.inventory.analyzedFiles / this.inventory.totalFiles) * 100)
                : 0
        };
    }
}
