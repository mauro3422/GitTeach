import path from 'path';
import fs from 'node:fs';
import { app } from 'electron';
import { LevelDBManager } from './db/LevelDBManager.js';
import { FileCacheManager } from './cache/FileCacheManager.js';
import { SessionCacheManager } from './cache/SessionCacheManager.js';
import { DiskMirrorService } from './cache/DiskMirrorService.js';

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

        // Initialize managers
        this.fileCacheManager = new FileCacheManager(this.globalDb);

        // Session DB (Analysis Results)
        this.sessionDb = null;
        this.sessionCacheManager = null;
        this.currentSessionId = null;

        // Disk mirroring
        this.mirrorPath = path.join(process.cwd(), 'logs', 'tracer_logs');
        this.diskMirrorService = new DiskMirrorService(this.mirrorPath);
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
            this.sessionCacheManager = null;
            this.currentSessionId = null;
            this.diskMirrorService.resetToBasePath();
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

        this.sessionCacheManager = new SessionCacheManager(this.sessionDb);
        this.currentSessionId = sessionId;
        this.diskMirrorService.setMirrorPath(sessionPath); // Redirect mirrors to session folder
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
        return await this.fileCacheManager.needsUpdate(owner, repo, path, sha);
    }

    async setFileSummary(owner, repo, path, sha, summary, content, fileMeta = {}) {
        await this.fileCacheManager.setFileSummary(owner, repo, path, sha, summary, content, fileMeta);
    }

    async getFileSummary(owner, repo, path) {
        return await this.fileCacheManager.getFileSummary(owner, repo, path);
    }

    async setRepoTreeSha(owner, repo, sha) {
        await this.fileCacheManager.setRepoTreeSha(owner, repo, sha);
    }

    async hasRepoChanged(owner, repo, currentSha) {
        return await this.fileCacheManager.hasRepoChanged(owner, repo, currentSha);
    }

    // --- REPO CACHE / ANALYSIS RESULTS (SESSION SCOPED) ---

    async appendRepoRawFinding(repoName, finding) {
        if (!this.sessionCacheManager) {
            throw new Error('No active session. Call switchSession() first.');
        }
        await this.sessionCacheManager.appendRepoRawFinding(repoName, finding);
        await this.diskMirrorService.mirrorRepoRawFinding(repoName, finding);
    }

    async persistRepoCuratedMemory(repoName, nodes) {
        if (!this.sessionCacheManager) {
            throw new Error('No active session. Call switchSession() first.');
        }
        await this.sessionCacheManager.persistRepoCuratedMemory(repoName, nodes);
        await this.diskMirrorService.mirrorRepoCuratedMemory(repoName, nodes);
    }

    async persistRepoBlueprint(repoName, blueprint) {
        if (!this.sessionCacheManager) {
            throw new Error('No active session. Call switchSession() first.');
        }
        await this.sessionCacheManager.persistRepoBlueprint(repoName, blueprint);
        await this.diskMirrorService.mirrorRepoBlueprint(repoName, blueprint);
    }

    async getAllRepoBlueprints() {
        if (!this.sessionCacheManager) {
            return [];
        }
        return await this.sessionCacheManager.getAllRepoBlueprints();
    }

    // --- INTELLIGENCE / IDENTITY (SESSION SCOPED) ---

    async setTechnicalIdentity(user, identity) {
        if (!this.sessionCacheManager) {
            throw new Error('No active session. Call switchSession() first.');
        }
        await this.sessionCacheManager.setTechnicalIdentity(user, identity);
    }

    async getTechnicalIdentity(user) {
        if (!this.sessionCacheManager) {
            return null;
        }
        return await this.sessionCacheManager.getTechnicalIdentity(user);
    }

    async setTechnicalFindings(user, findings) {
        if (!this.sessionCacheManager) {
            throw new Error('No active session. Call switchSession() first.');
        }
        await this.sessionCacheManager.setTechnicalFindings(user, findings);
    }

    async getTechnicalFindings(user) {
        if (!this.sessionCacheManager) {
            return null;
        }
        return await this.sessionCacheManager.getTechnicalFindings(user);
    }

    async setCognitiveProfile(user, profile) {
        if (!this.sessionCacheManager) {
            throw new Error('No active session. Call switchSession() first.');
        }
        await this.sessionCacheManager.setCognitiveProfile(user, profile);
    }

    async getCognitiveProfile(user) {
        if (!this.sessionCacheManager) {
            return null;
        }
        return await this.sessionCacheManager.getCognitiveProfile(user);
    }

    // --- UTILS / LOGS ---

    async setWorkerAudit(id, finding) {
        if (!this.sessionCacheManager) {
            throw new Error('No active session. Call switchSession() first.');
        }
        await this.sessionCacheManager.setWorkerAudit(id, finding);
    }

    async getWorkerAudit(id) {
        if (!this.sessionCacheManager) {
            return [];
        }
        return await this.sessionCacheManager.getWorkerAudit(id);
    }

    async persistRepoPartitions(repoName, partitions) {
        if (!this.sessionCacheManager) {
            throw new Error('No active session. Call switchSession() first.');
        }
        await this.sessionCacheManager.persistRepoPartitions(repoName, partitions);
    }

    async persistRepoGoldenKnowledge(repoName, data) {
        if (!this.sessionCacheManager) {
            throw new Error('No active session. Call switchSession() first.');
        }
        await this.sessionCacheManager.persistRepoGoldenKnowledge(repoName, data);
    }

    async getRepoGoldenKnowledge(repoName) {
        if (!this.sessionCacheManager) {
            return null;
        }
        return await this.sessionCacheManager.getRepoGoldenKnowledge(repoName);
    }

    async generateRunSummary(stats) {
        return await this.diskMirrorService.generateRunSummary(stats, this.currentSessionId);
    }

    async getStats() {
        return {
            type: 'LevelDB',
            status: this.globalDb.status,
            sessionActive: !!this.sessionDb,
            currentSessionId: this.currentSessionId
        };
    }

    async clearCache() {
        console.warn('LevelDB clear not fully implemented');
    }
}


export default new CacheService();
