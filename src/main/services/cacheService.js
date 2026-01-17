import path from 'path';
import { app } from 'electron';
import { LevelDBManager } from './db/LevelDBManager.js';

/**
 * CacheService - Orchestrates persistence via LevelDB
 * High-performance Facade for all persistence operations
 */
class CacheService {
    constructor() {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'giteach-leveldb');

        this.db = new LevelDBManager(dbPath);
        this.db.open().catch(err => console.error('[CacheService] DB Init Failed:', err));
    }

    // --- REPO CACHE ---

    async getRepoCache(owner, repo) {
        // Legacy support or new impl? LevelDB handles granular keys.
        // Returning null to force re-fetch or implementing if critical.
        return null;
    }

    async setRepoCache(owner, repo, data) {
        // Deprecated in favor of granular storage
    }

    async needsUpdate(owner, repo, path, sha) {
        const key = `raw:file:${repo}:${path}`;
        const cached = await this.db.get(key);
        if (!cached) return true;
        return cached.meta?.sha !== sha;
    }

    async setFileSummary(owner, repo, path, sha, summary, content, fileMeta = {}) {
        const key = `raw:file:${repo}:${path}`;
        const data = {
            content,
            summary,
            meta: { sha, ...fileMeta },
            updatedAt: new Date().toISOString()
        };
        await this.db.put(key, data);
    }

    async getFileSummary(owner, repo, path) {
        const key = `raw:file:${repo}:${path}`;
        return await this.db.get(key);
    }

    async setRepoTreeSha(owner, repo, sha) {
        await this.db.put(`meta:repo:tree:${owner}:${repo}`, sha);
    }

    async hasRepoChanged(owner, repo, currentSha) {
        const stored = await this.db.get(`meta:repo:tree:${owner}:${repo}`);
        return stored !== currentSha;
    }

    // --- WORKER AUDIT ---

    async setWorkerAudit(id, finding) {
        // Log stream: append accessible via prefixes
        const timestamp = new Date().toISOString();
        const rand = Math.random().toString(36).substring(7);
        const key = `log:worker:${id}:${timestamp}:${rand}`;
        await this.db.put(key, finding);
    }

    async getWorkerAudit(id) {
        return await this.db.getByPrefix(`log:worker:${id}`);
    }

    // --- INTELLIGENCE ---

    async setTechnicalIdentity(user, identity) {
        await this.db.put(`meta:identity:${user}`, identity);
    }

    async getTechnicalIdentity(user) {
        return await this.db.get(`meta:identity:${user}`);
    }

    async setTechnicalFindings(user, findings) {
        await this.db.put(`meta:findings:${user}`, findings);
    }

    async getTechnicalFindings(user) {
        return await this.db.get(`meta:findings:${user}`);
    }

    async setCognitiveProfile(user, profile) {
        await this.db.put(`meta:profile:${user}`, profile);
    }

    async getCognitiveProfile(user) {
        return await this.db.get(`meta:profile:${user}`);
    }

    // --- REPO-CENTRIC PERSISTENCE (V3) ---

    async appendRepoRawFinding(repoName, finding) {
        const timestamp = new Date().toISOString();
        const rand = Math.random().toString(36).substring(7);
        const key = `raw:finding:${repoName}:${timestamp}:${rand}`;
        await this.db.put(key, finding);
    }

    async persistRepoCuratedMemory(repoName, nodes) {
        // Atomic batch write
        const ops = nodes.map(node => ({
            type: 'put',
            key: `mem:node:${node.uid}`,
            value: node
        }));

        // Update index
        const indexKey = `idx:repo:${repoName}:nodes`;
        const existingIndex = (await this.db.get(indexKey)) || [];
        const newUids = nodes.map(n => n.uid);
        const combinedIndex = [...new Set([...existingIndex, ...newUids])];

        ops.push({
            type: 'put',
            key: indexKey,
            value: combinedIndex
        });

        await this.db.batch(ops);
    }

    async getAllRepoBlueprints() {
        // Blueprints are stored as 'meta:blueprint:{repo}'
        const blueprints = await this.db.getByPrefix('meta:blueprint:');
        return blueprints.map(entry => entry.value);
    }

    async persistRepoBlueprint(repoName, blueprint) {
        await this.db.put(`meta:blueprint:${repoName}`, blueprint);
    }

    async persistRepoPartitions(repoName, partitions) {
        // Persist partitioned insights for fast querying by layer
        await this.db.put(`meta:partitions:${repoName}`, partitions);
    }

    /**
     * Cache Statistics
     */
    async getStats() {
        // Rough estimate or implement db.iterator().all() count
        return { type: 'LevelDB', status: this.db.status };
    }

    /**
     * Clear All Cache
     */
    async clearCache() {
        console.warn('LevelDB clear not fully implemented (requires iterator delete)');
        // TODO: iterate and delete all
    }
}

export default new CacheService();
