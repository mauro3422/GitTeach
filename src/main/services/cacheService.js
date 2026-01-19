import path from 'path';
import fs from 'node:fs';
import { app } from 'electron';
import { LevelDBManager } from './db/LevelDBManager.js';

/**
 * CacheService - Orchestrates persistence via LevelDB
 * High-performance Facade for all persistence operations
 */
class CacheService {
    constructor() {
        this.userDataPath = app.getPath('userData');
        this.globalDbPath = path.join(this.userDataPath, 'giteach-leveldb');

        // Always open Global DB for file cache
        this.globalDb = new LevelDBManager(this.globalDbPath);
        this.globalDb.open().catch(err => console.error('[CacheService] Global DB Init Failed:', err));

        // Session DB (Analysis Results)
        this.sessionDb = null;
        this.currentSessionId = null;

        // Mirroring path (User Request: Human readable logs)
        this.mirrorPath = path.join(process.cwd(), 'logs', 'tracer_logs');
        this.currentMirrorPath = this.mirrorPath;

        if (!fs.existsSync(this.mirrorPath)) {
            fs.mkdirSync(this.mirrorPath, { recursive: true });
        }
    }

    /**
     * Helper to get the active DB for Results (Session if active, else Global)
     */
    get resultsDb() {
        return this.sessionDb || this.globalDb;
    }

    /**
     * Switches the active session for Results isolation
     */
    async switchSession(sessionId) {
        if (!sessionId) {
            // Revert results to global
            if (!this.sessionDb) return;
            console.log('[CacheService] Switching results back to Global DB');
            await this.sessionDb.close();
            this.sessionDb = null;
            this.currentSessionId = null;
            this.currentMirrorPath = this.mirrorPath;
            return;
        }

        // Create a session-specific path inside logs/sessions
        const sessionPath = path.join(process.cwd(), 'logs', 'sessions', sessionId);
        const sessionDbPath = path.join(sessionPath, 'db');
        if (!fs.existsSync(sessionDbPath)) {
            fs.mkdirSync(sessionDbPath, { recursive: true });
        }

        console.log(`[CacheService] Switching results to Session: ${sessionId}`);
        if (this.sessionDb) await this.sessionDb.close();

        this.sessionDb = new LevelDBManager(sessionDbPath);
        await this.sessionDb.open();

        this.currentSessionId = sessionId;
        this.currentMirrorPath = sessionPath; // Redirect mirrors to session folder
    }

    /**
     * Helper to mirror data to readable JSON files
     */
    async mirrorToDisk(subfolder, filename, data, append = false) {
        try {
            const baseDir = this.currentMirrorPath || this.mirrorPath;
            const dir = path.join(baseDir, subfolder);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, filename);

            if (append) {
                fs.appendFileSync(filePath, JSON.stringify(data) + '\n');
            } else {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            }
        } catch (e) {
            console.error(`[CacheService] Mirror failed: ${e.message}`);
        }
    }

    // --- FILE CACHE (ALWAYS GLOBAL) ---

    async needsUpdate(owner, repo, path, sha) {
        const key = `raw:file:${repo}:${path}`;
        const cached = await this.globalDb.get(key);
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
        await this.globalDb.put(key, data);
    }

    async getFileSummary(owner, repo, path) {
        const key = `raw:file:${repo}:${path}`;
        return await this.globalDb.get(key);
    }

    async setRepoTreeSha(owner, repo, sha) {
        await this.globalDb.put(`meta:repo:tree:${owner}:${repo}`, sha);
    }

    async hasRepoChanged(owner, repo, currentSha) {
        const stored = await this.globalDb.get(`meta:repo:tree:${owner}:${repo}`);
        return stored !== currentSha;
    }

    // --- REPO CACHE / ANALYSIS RESULTS (SESSION SCOPED) ---

    async appendRepoRawFinding(repoName, finding) {
        const timestamp = new Date().toISOString();
        const rand = Math.random().toString(36).substring(7);
        const key = `raw:finding:${repoName}:${timestamp}:${rand}`;
        await this.resultsDb.put(key, finding);

        // MIRROR
        this.mirrorToDisk(path.join('repos', repoName), 'raw_findings.jsonl', finding, true);
    }

    async persistRepoCuratedMemory(repoName, nodes) {
        const ops = nodes.map(node => ({
            type: 'put',
            key: `mem:node:${node.uid}`,
            value: node
        }));

        const indexKey = `idx:repo:${repoName}:nodes`;
        const existingIndex = (await this.resultsDb.get(indexKey)) || [];
        const newUids = nodes.map(n => n.uid);
        const combinedIndex = [...new Set([...existingIndex, ...newUids])];

        ops.push({
            type: 'put',
            key: indexKey,
            value: combinedIndex
        });

        await this.resultsDb.batch(ops);
        this.mirrorToDisk(path.join('repos', repoName), 'curated_memory.json', nodes);
    }

    async persistRepoBlueprint(repoName, blueprint) {
        await this.resultsDb.put(`meta:blueprint:${repoName}`, blueprint);
        this.mirrorToDisk(path.join('repos', repoName), 'blueprint.json', blueprint);
    }

    async getAllRepoBlueprints() {
        const blueprints = await this.resultsDb.getByPrefix('meta:blueprint:');
        return blueprints.map(entry => entry.value);
    }

    // --- INTELLIGENCE / IDENTITY (SESSION SCOPED) ---

    async setTechnicalIdentity(user, identity) {
        await this.resultsDb.put(`meta:identity:${user}`, identity);
    }

    async getTechnicalIdentity(user) {
        return await this.resultsDb.get(`meta:identity:${user}`);
    }

    async setTechnicalFindings(user, findings) {
        await this.resultsDb.put(`meta:findings:${user}`, findings);
    }

    async getTechnicalFindings(user) {
        return await this.resultsDb.get(`meta:findings:${user}`);
    }

    async setCognitiveProfile(user, profile) {
        await this.resultsDb.put(`meta:profile:${user}`, profile);
    }

    async getCognitiveProfile(user) {
        return await this.resultsDb.get(`meta:profile:${user}`);
    }

    // --- UTILS / LOGS ---

    async setWorkerAudit(id, finding) {
        const timestamp = new Date().toISOString();
        const rand = Math.random().toString(36).substring(7);
        const key = `log:worker:${id}:${timestamp}:${rand}`;
        await this.resultsDb.put(key, finding);
    }

    async getWorkerAudit(id) {
        return await this.resultsDb.getByPrefix(`log:worker:${id}`);
    }

    async persistRepoPartitions(repoName, partitions) {
        await this.resultsDb.put(`meta:partitions:${repoName}`, partitions);
    }

    async persistRepoGoldenKnowledge(repoName, data) {
        await this.resultsDb.put(`meta:golden:${repoName}`, data);
    }

    async getRepoGoldenKnowledge(repoName) {
        return await this.resultsDb.get(`meta:golden:${repoName}`);
    }

    async generateRunSummary(stats) {
        const summary = {
            id: this.currentSessionId || `TRACE_${Date.now()}`,
            timestamp: new Date().toISOString(),
            stats: stats,
            performance: stats.performance || {},
            reposAnalyzed: stats.reposAnalyzed || [],
            coverage: {
                totalFiles: stats.totalFiles || 0,
                analyzed: stats.analyzed || 0,
                percent: stats.progress || 0
            }
        };

        await this.mirrorToDisk('', 'SUMMARY.json', summary);
        return summary;
    }

    async getStats() {
        return {
            type: 'LevelDB',
            status: this.globalDb.status,
            sessionActive: !!this.sessionDb
        };
    }

    async clearCache() {
        console.warn('LevelDB clear not fully implemented');
    }
}


export default new CacheService();
