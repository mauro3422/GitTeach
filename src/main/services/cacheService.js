import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { FileStorage } from './cache/FileStorage.js';
import { RepositoryCacheManager } from './cache/RepositoryCacheManager.js';
import { AuditLogManager } from './cache/AuditLogManager.js';
import { IntelligenceCacheManager } from './cache/IntelligenceCacheManager.js';

/**
 * CacheService - Orchestrates persistence managers (ESM Facade)
 */
class CacheService {
    constructor() {
        const userDataPath = app.getPath('userData');
        this.paths = {
            workersDir: path.join(userDataPath, 'workers'),
            identity: path.join(userDataPath, 'technical_identity.json'),
            profile: path.join(userDataPath, 'cognitive_profile.json'),
            evidence: path.join(userDataPath, 'curation_evidence.json')
        };

        // Ensure directories exist
        if (!fs.existsSync(this.paths.workersDir)) {
            fs.mkdirSync(this.paths.workersDir, { recursive: true });
        }

        // Initialize Managers
        this.repoManager = new RepositoryCacheManager(this.paths.workersDir);
        this.auditManager = new AuditLogManager(this.paths.workersDir);
        this.intelManager = new IntelligenceCacheManager(this.paths);
    }

    // --- REPO CACHE ---
    getRepoCache(owner, repo) { return this.repoManager.getRepoCache(owner, repo); }
    setRepoCache(owner, repo, data) { this.repoManager.setRepoCache(owner, repo, data); }
    needsUpdate(owner, repo, path, sha) { return this.repoManager.needsUpdate(owner, repo, path, sha); }
    setFileSummary(owner, repo, path, sha, sum, cont) { this.repoManager.setFileSummary(owner, repo, path, sha, sum, cont); }
    getFileSummary(owner, repo, path) { return this.repoManager.getFileSummary(owner, repo, path); }
    setRepoTreeSha(owner, repo, sha) { this.repoManager.setRepoTreeSha(owner, repo, sha); }
    hasRepoChanged(owner, repo, sha) { return this.repoManager.hasRepoChanged(owner, repo, sha); }

    // --- WORKER AUDIT ---
    setWorkerAudit(id, finding) { this.auditManager.appendFinding(id, finding); }
    getWorkerAudit(id) { return this.auditManager.getAudit(id); }

    // --- INTELLIGENCE ---
    setTechnicalIdentity(user, id) { this.intelManager.setIdentity(user, id); }
    getTechnicalIdentity(user) { return this.intelManager.getIdentity(user); }
    setTechnicalFindings(user, ev) { this.intelManager.setFindings(user, ev); }
    getTechnicalFindings(user) { return this.intelManager.getFindings(user); }
    setCognitiveProfile(user, prof) { this.intelManager.setProfile(user, prof); }
    getCognitiveProfile(user) { return this.intelManager.getProfile(user); }

    /**
     * Cache Statistics
     */
    getStats() {
        let repoCount = 0;
        let fileCount = 0;
        let auditEntries = 0;

        try {
            const files = fs.readdirSync(this.paths.workersDir);
            const repoFiles = files.filter(f => f.endsWith('.json'));
            repoCount = repoFiles.length;

            repoFiles.forEach(f => {
                const data = FileStorage.loadJson(path.join(this.paths.workersDir, f), null);
                if (data && data.files) fileCount += Object.keys(data.files).length;
            });

            const auditFiles = files.filter(f => f.endsWith('.jsonl'));
            auditFiles.forEach(f => {
                const lines = FileStorage.readLines(path.join(this.paths.workersDir, f));
                auditEntries += lines.length;
            });
        } catch (e) { }

        return { repoCount, fileCount, auditEntries, lastUpdate: new Date().toISOString() };
    }

    /**
     * Clear All Cache
     */
    clearCache() {
        this.intelManager.clear();
        if (fs.existsSync(this.paths.workersDir)) {
            const files = fs.readdirSync(this.paths.workersDir);
            files.forEach(f => FileStorage.deleteFile(path.join(this.paths.workersDir, f)));
        }
        console.log('[CacheService] All literal technical memory files cleared.');
    }
}

export default new CacheService();
