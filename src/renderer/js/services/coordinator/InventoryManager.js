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

    registerFiles(repoName, tree, treeSha) {
        const repo = this.data.repos.find(r => r.name === repoName);
        if (!repo) return;

        repo.treeSha = treeSha;
        repo.files = tree.map(node => ({
            path: node.path,
            sha: node.sha,
            size: node.size,
            type: node.type,
            status: 'pending',
            priority: PriorityEngine.calculate(node.path)
        }));

        repo.files.sort((a, b) => b.priority - a.priority);
        this.data.totalFiles += repo.files.filter(f => f.type === 'blob').length;
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
            file.status = 'completed';
            file.summary = summary;
            file.rawData = rawData;
            this.data.analyzedFiles++;
            this.data.completedFiles.push({ repo: repoName, path: filePath });
        }
    }

    markFailed(repoName, filePath, error) {
        const repo = this.data.repos.find(r => r.name === repoName);
        if (!repo) return;

        const file = repo.files.find(f => f.path === filePath);
        if (file) {
            file.status = 'failed';
            file.error = error;
            this.data.analyzedFiles++;
            this.data.failedFiles.push({ repo: repoName, path: filePath, error });
        }
    }

    getStats() {
        return {
            repos: this.data.repos.length,
            totalFiles: this.data.totalFiles,
            analyzed: this.data.analyzedFiles,
            pending: this.data.totalFiles - this.data.analyzedFiles,
            progress: this.data.totalFiles > 0
                ? Math.round((this.data.analyzedFiles / this.data.totalFiles) * 100)
                : 0
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
