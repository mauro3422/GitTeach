import { PriorityEngine } from './PriorityEngine.js';

/**
 * InventoryManager - Pure data management for repositories and files
 */
export class InventoryManager {
    constructor() {
        this.data = {
            repos: [],
            totalFiles: 0,
            analyzedFiles: 0,
            pendingFiles: [], // Logic uses repo.files, this is for overall stats
            completedFiles: [],
            failedFiles: []
        };
    }

    init(repos) {
        this.data.repos = repos.map(r => ({
            name: r.name,
            fullName: r.full_name,
            language: r.language,
            files: [],
            status: 'pending',
            treeSha: null
        }));
    }

    registerFiles(repoName, tree, treeSha, maxFiles = 9999) {
        const repo = this.data.repos.find(r => r.name === repoName);
        if (!repo) return;

        // Reset old file count for this repo to avoid accumulation bugs
        const oldActiveCount = repo.files ? repo.files.filter(f => f.type === 'blob' && f.status !== 'skipped').length : 0;
        this.data.totalFiles -= oldActiveCount;

        repo.treeSha = treeSha;
        const allPotentialFiles = tree.map(node => ({
            path: node.path,
            sha: node.sha,
            size: node.size,
            type: node.type,
            status: 'pending',
            priority: PriorityEngine.calculate(node.path)
        }));

        allPotentialFiles.sort((a, b) => b.priority - a.priority);

        // STRICT CAPPING: Only register the top N files as pending, others as skipped
        repo.files = allPotentialFiles.map((f, index) => {
            if (f.type === 'blob' && index >= maxFiles) {
                return { ...f, status: 'skipped' };
            }
            return f;
        });

        const activeBlobs = repo.files.filter(f => f.type === 'blob' && f.status !== 'skipped');
        this.data.totalFiles += activeBlobs.length;
    }

    getNextBatch(batchSize, ignorePriority) {
        const batch = [];
        for (const repo of this.data.repos) {
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

    markCompleted(repoName, filePath, summary, rawData) {
        const repo = this.data.repos.find(r => r.name === repoName);
        if (!repo) return;

        const file = repo.files.find(f => f.path === filePath);
        if (file) {
            // ENRICHMENT Logic: If already completed, skip incrementing count,
            // but allow updating metadata/summary if this is "richer" data (durationMs > 0)
            const isRicher = rawData && typeof rawData.durationMs === 'number' && rawData.durationMs > 0;
            const exists = file.status === 'completed';

            if (exists && !isRicher) return;

            // If it was skipped, but we are marking it as completed (forced analysis),
            // we should probably increment totalFiles to keep progress accurate
            if (file.status === 'skipped') {
                this.data.totalFiles++;
            }

            if (!exists) {
                this.data.analyzedFiles++;
                this.data.completedFiles.push({ repo: repoName, path: filePath });
            }

            file.status = 'completed';
            file.summary = summary;
            file.rawData = rawData;
        }
    }

    markFailed(repoName, filePath, error) {
        const repo = this.data.repos.find(r => r.name === repoName);
        if (!repo) return;

        const file = repo.files.find(f => f.path === filePath);
        if (file) {
            // IDEMPOTENCY: Only count once
            if (file.status === 'completed' || file.status === 'failed') return;

            file.status = 'failed';
            file.error = error;
            this.data.analyzedFiles++;
            this.data.failedFiles.push({ repo: repoName, path: filePath, error });
        }
    }

    getStats() {
        const total = Number(this.data.totalFiles) || 0;
        const analyzed = Number(this.data.analyzedFiles) || 0;

        return {
            repos: this.data.repos.length,
            totalFiles: total,
            analyzed: analyzed,
            pending: Math.max(0, total - analyzed),
            progress: total > 0 ? Math.round((analyzed / total) * 100) : 0
        };
    }

    /**
     * Checks if a specific repository has finished processing all files
     */
    isRepoComplete(repoName) {
        const repo = this.data.repos.find(r => r.name === repoName);
        if (!repo) return false;

        // A repo is complete if it has files and NONE are pending or processing
        const hasFiles = repo.files.length > 0;
        const allDone = repo.files.every(f => f.status === 'completed' || f.status === 'failed' || f.status === 'skipped');

        return hasFiles && allDone;
    }
}
