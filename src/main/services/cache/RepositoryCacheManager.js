import path from 'path';
import { FileStorage } from './FileStorage.js';

/**
 * RepositoryCacheManager - Manages repository trees and file summaries
 */
export class RepositoryCacheManager {
    constructor(workersDir) {
        this.workersDir = workersDir;
        this.memory = {};
    }

    getKey(owner, repo) {
        return `${owner}_${repo}`.replace(/[\/\\]/g, '_');
    }

    getRepoCache(owner, repo) {
        const key = this.getKey(owner, repo);
        if (this.memory[key]) return this.memory[key];

        const filePath = path.join(this.workersDir, `${key}.json`);
        const data = FileStorage.loadJson(filePath, null);
        if (data) this.memory[key] = data;
        return data;
    }

    setRepoCache(owner, repo, data) {
        const key = this.getKey(owner, repo);
        const repoData = {
            ...data,
            lastUpdated: new Date().toISOString()
        };
        this.memory[key] = repoData;
        const filePath = path.join(this.workersDir, `${key}.json`);
        FileStorage.saveJson(filePath, repoData);
    }

    needsUpdate(owner, repo, filePath, newSha) {
        const repoCache = this.getRepoCache(owner, repo);
        if (!repoCache || !repoCache.files) return true;

        const cachedFile = repoCache.files[filePath];
        if (!cachedFile) return true;

        return cachedFile.sha !== newSha;
    }

    setFileSummary(owner, repo, filePath, sha, summary, contentSnippet = null) {
        let repoCache = this.getRepoCache(owner, repo) || { files: {}, lastUpdated: null };
        if (!repoCache.files) repoCache.files = {};

        repoCache.files[filePath] = {
            sha: sha,
            summary: summary,
            contentSnippet: contentSnippet ? contentSnippet.substring(0, 500) : null,
            analyzedAt: new Date().toISOString()
        };

        this.setRepoCache(owner, repo, repoCache);
    }

    getFileSummary(owner, repo, filePath) {
        const repoCache = this.getRepoCache(owner, repo);
        return repoCache?.files?.[filePath] || null;
    }

    setRepoTreeSha(owner, repo, treeSha) {
        let repoCache = this.getRepoCache(owner, repo) || { files: {} };
        repoCache.treeSha = treeSha;
        repoCache.lastUpdated = new Date().toISOString();
        this.setRepoCache(owner, repo, repoCache);
    }

    hasRepoChanged(owner, repo, newTreeSha) {
        const repoCache = this.getRepoCache(owner, repo);
        return !repoCache || repoCache.treeSha !== newTreeSha;
    }
}
