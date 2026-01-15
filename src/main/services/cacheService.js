/**
 * CacheService - Sistema de cache local para datos de GitHub
 * Evita llamadas repetidas a la API y permite análisis instantáneo
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class CacheService {
    constructor() {
        const userDataPath = app.getPath('userData');
        this.paths = {
            workersDir: path.join(userDataPath, 'workers'),
            identity: path.join(userDataPath, 'technical_identity.json'),
            profile: path.join(userDataPath, 'cognitive_profile.json'),
            evidence: path.join(userDataPath, 'curation_evidence.json')
        };

        // Ensure workers directory exists
        if (!fs.existsSync(this.paths.workersDir)) {
            fs.mkdirSync(this.paths.workersDir, { recursive: true });
        }

        this.cache = {
            identity: this.loadJson(this.paths.identity, {}),
            profile: this.loadJson(this.paths.profile, {}),
            evidence: this.loadJson(this.paths.evidence, {}),
            workerStates: {} // Audit state for worker1..worker4 and backroom
        };
    }

    loadJson(filePath, defaultValue) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) {
            console.error(`[CacheService] Error loading ${path.basename(filePath)}:`, e);
        }
        return defaultValue;
    }

    saveJson(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
            console.error(`[CacheService] Error saving ${path.basename(filePath)}:`, e);
        }
    }

    getRepoCache(owner, repo) {
        const key = `${owner}_${repo}`.replace(/[\/\\]/g, '_');
        if (this.cache.repoMemory[key]) return this.cache.repoMemory[key];

        const filePath = path.join(this.paths.workersDir, `${key}.json`);
        const data = this.loadJson(filePath, null);
        if (data) this.cache.repoMemory[key] = data;
        return data;
    }

    setRepoCache(owner, repo, data) {
        const key = `${owner}_${repo}`.replace(/[\/\\]/g, '_');
        const repoData = {
            ...data,
            lastUpdated: new Date().toISOString()
        };
        this.cache.repoMemory[key] = repoData;
        const filePath = path.join(this.paths.workersDir, `${key}.json`);
        this.saveJson(filePath, repoData);
    }

    /**
     * Appends a finding to a specific worker's audit file (JSONL format)
     */
    setWorkerAudit(workerId, finding) {
        // IDs: 1, 2, 3, 4 or 'BACKGROUND'
        let name = workerId;
        if (typeof workerId === 'string') {
            const upper = workerId.toUpperCase();
            if (upper.includes('BACK') || upper.includes('ROOM')) name = 'BACKGROUND';
        }

        const fileName = `worker_${name}.jsonl`;
        const filePath = path.join(this.paths.workersDir, fileName);

        const line = JSON.stringify({
            ...finding,
            timestamp: new Date().toISOString()
        }) + '\n';

        try {
            fs.appendFileSync(filePath, line, 'utf8');
        } catch (e) {
            console.error(`[CacheService] Error appending to audit ${fileName}:`, e);
        }
    }

    getWorkerAudit(workerId) {
        let name = workerId;
        if (typeof workerId === 'string') {
            const upper = workerId.toUpperCase();
            if (upper.includes('BACK') || upper.includes('ROOM')) name = 'BACKGROUND';
        }

        const filePath = path.join(this.paths.workersDir, `worker_${name}.jsonl`);
        if (!fs.existsSync(filePath)) return null;

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return content.trim().split('\n').filter(l => l.trim()).map(line => JSON.parse(line));
        } catch (e) {
            console.error(`[CacheService] Error reading audit worker_${name}.jsonl:`, e);
            return null;
        }
    }

    /**
     * Verifica si un archivo necesita actualización comparando SHA
     */
    needsUpdate(owner, repo, filePath, newSha) {
        const repoCache = this.getRepoCache(owner, repo);
        if (!repoCache || !repoCache.files) return true;

        const cachedFile = repoCache.files[filePath];
        if (!cachedFile) return true;

        return cachedFile.sha !== newSha;
    }

    /**
     * Guarda el resumen de un archivo
     */
    setFileSummary(owner, repo, filePath, sha, summary, content = null) {
        let repoCache = this.getRepoCache(owner, repo);

        if (!repoCache) {
            repoCache = { files: {}, lastUpdated: null };
        }
        if (!repoCache.files) {
            repoCache.files = {};
        }

        repoCache.files[filePath] = {
            sha: sha,
            summary: summary,
            contentSnippet: content ? content.substring(0, 500) : null,
            analyzedAt: new Date().toISOString()
        };

        this.setRepoCache(owner, repo, repoCache);
    }

    /**
     * Obtiene el resumen cacheado de un archivo
     */
    getFileSummary(owner, repo, filePath) {
        const repoCache = this.getRepoCache(owner, repo);
        if (!repoCache || !repoCache.files) return null;
        return repoCache.files[filePath] || null;
    }

    /**
     * Guarda el tree SHA del repositorio para detección de cambios
     */
    setRepoTreeSha(owner, repo, treeSha) {
        let repoCache = this.getRepoCache(owner, repo);
        if (!repoCache) {
            repoCache = { files: {} };
        }
        repoCache.treeSha = treeSha;
        repoCache.lastUpdated = new Date().toISOString();
        this.setRepoCache(owner, repo, repoCache);
    }

    /**
     * Verifica si el tree del repo cambió
     */
    hasRepoChanged(owner, repo, newTreeSha) {
        const repoCache = this.getRepoCache(owner, repo);
        if (!repoCache) return true;
        return repoCache.treeSha !== newTreeSha;
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        let repoCount = 0;
        let fileCount = 0;
        let auditEntries = 0;

        try {
            const files = fs.readdirSync(this.paths.workersDir);

            // Filter only repo cache files (JSON) - explicitly exclude known system files if any, but .json is safe vs .jsonl
            const repoFiles = files.filter(f => f.endsWith('.json'));
            repoCount = repoFiles.length;

            // Calculate repo files
            repoFiles.forEach(f => {
                const filePath = path.join(this.paths.workersDir, f);
                const data = this.loadJson(filePath, null);
                if (data && data.files) {
                    fileCount += Object.keys(data.files).length;
                }
            });

            // Calculate audit entries (lines in JSONL)
            const auditFiles = files.filter(f => f.endsWith('.jsonl'));
            auditFiles.forEach(f => {
                try {
                    const content = fs.readFileSync(path.join(this.paths.workersDir, f), 'utf8');
                    // Count non-empty lines
                    const lines = content.split('\n').filter(l => l.trim().length > 0).length;
                    auditEntries += lines;
                } catch (e) { }
            });

        } catch (e) { }

        return {
            repoCount,
            fileCount,
            auditEntries,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Guarda el ADN del desarrollador (síntesis profunda)
     */
    setTechnicalIdentity(username, identity) {
        this.cache.identity[username] = {
            identity: identity,
            updatedAt: new Date().toISOString()
        };
        this.saveJson(this.paths.identity, this.cache.identity);
    }

    getTechnicalIdentity(username) {
        if (!this.cache.identity[username]) return null;
        return this.cache.identity[username].identity;
    }

    setTechnicalFindings(username, evidence) {
        this.cache.evidence[username] = {
            evidence: evidence,
            updatedAt: new Date().toISOString()
        };
        this.saveJson(this.paths.evidence, this.cache.evidence);
    }

    getTechnicalFindings(username) {
        if (!this.cache.evidence[username]) return null;
        return this.cache.evidence[username].evidence;
    }

    setCognitiveProfile(username, profile) {
        this.cache.profile[username] = {
            ...profile,
            username,
            lastUpdated: new Date().toISOString()
        };
        this.saveJson(this.paths.profile, this.cache.profile);
        console.log('[CacheService] Cognitive Profile saved to disk:', profile.title);
    }

    getCognitiveProfile(username) {
        return this.cache.profile[username] || null;
    }

    /**
     * Limpia el cache (para debug/reset)
     */
    clearCache() {
        this.cache = {
            identity: {},
            profile: {},
            evidence: {},
            workerStates: {}
        };
        // Unlink intelligence files
        ['identity', 'profile', 'evidence'].forEach(k => {
            if (fs.existsSync(this.paths[k])) fs.unlinkSync(this.paths[k]);
        });
        // Unlink all worker files in the workers directory
        if (fs.existsSync(this.paths.workersDir)) {
            const files = fs.readdirSync(this.paths.workersDir);
            files.forEach(f => {
                try {
                    fs.unlinkSync(path.join(this.paths.workersDir, f));
                } catch (e) { }
            });
        }
        console.log('[CacheService] All literal technical memory files cleared.');
    }
}

module.exports = new CacheService();
