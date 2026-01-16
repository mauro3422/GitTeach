import fs from 'fs';
import path from 'path';
import { MOCK_PERSISTENCE_PATH, REPOS_CACHE_PATH } from './TracerContext.js';

/**
 * PersistenceMock - Simulates CacheAPI and FS persistence
 * 
 * Responsabilidad: Proveer window.cacheAPI inyectando datos en
 * la carpeta de sesión mock_persistence.
 */


let cachedDb = null;

export class PersistenceMock {
    static _loadDb() {
        if (cachedDb) return cachedDb;
        try {
            if (fs.existsSync(REPOS_CACHE_PATH)) {
                cachedDb = JSON.parse(fs.readFileSync(REPOS_CACHE_PATH, 'utf8'));
            } else {
                cachedDb = { repos: {} };
            }
        } catch (e) {
            cachedDb = { repos: {} };
        }
        return cachedDb;
    }

    static _saveDb() {
        if (!cachedDb) return;
        try {
            fs.writeFileSync(REPOS_CACHE_PATH, JSON.stringify(cachedDb, null, 2), 'utf8');
        } catch (e) { }
    }

    static createAPI() {
        const db = this._loadDb();

        return {
            appendWorkerLog: async (workerId, finding) => {
                try {
                    let name = workerId;
                    if (typeof workerId === 'string' && (workerId.toUpperCase().includes('BACK') || workerId.toUpperCase().includes('ROOM'))) {
                        name = 'BACKGROUND';
                    }
                    const filePath = path.join(MOCK_PERSISTENCE_PATH, `worker_${name}.jsonl`);
                    const line = JSON.stringify({ ...finding, timestamp: new Date().toISOString() }) + '\n';
                    fs.appendFileSync(filePath, line, 'utf8');
                    return true;
                } catch (e) { return false; }
            },
            getWorkerAudit: async () => [],
            getTechnicalIdentity: async (u) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'technical_identity.json');
                    if (fs.existsSync(p)) {
                        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
                        return data[u]?.identity || null;
                    }
                } catch (e) { }
                return null;
            },
            getDeveloperDNA: async (u) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'technical_identity.json');
                    if (fs.existsSync(p)) {
                        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
                        return data[u]?.identity || null;
                    }
                } catch (e) { }
                return null;
            },
            setTechnicalIdentity: async (u, data) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'technical_identity.json');
                    let localDb = {};
                    if (fs.existsSync(p)) localDb = JSON.parse(fs.readFileSync(p, 'utf8'));
                    localDb[u] = { identity: data, updatedAt: new Date().toISOString() };
                    fs.writeFileSync(p, JSON.stringify(localDb, null, 2));
                    return true;
                } catch (e) { return false; }
            },
            getTechnicalFindings: async (u) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'curation_evidence.json');
                    if (fs.existsSync(p)) {
                        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
                        return data[u]?.evidence || null;
                    }
                } catch (e) { }
                return null;
            },
            setTechnicalFindings: async (u, data) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'curation_evidence.json');
                    let localDb = {};
                    if (fs.existsSync(p)) localDb = JSON.parse(fs.readFileSync(p, 'utf8'));
                    localDb[u] = { evidence: data, updatedAt: new Date().toISOString() };
                    fs.writeFileSync(p, JSON.stringify(localDb, null, 2));
                    return true;
                } catch (e) { return false; }
            },
            getCognitiveProfile: async (u) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'cognitive_profile.json');
                    if (fs.existsSync(p)) {
                        const localDb = JSON.parse(fs.readFileSync(p, 'utf8'));
                        return localDb[u] || null;
                    }
                } catch (e) { }
                return null;
            },
            setCognitiveProfile: async (u, data) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'cognitive_profile.json');
                    let localDb = {};
                    if (fs.existsSync(p)) localDb = JSON.parse(fs.readFileSync(p, 'utf8'));
                    localDb[u] = data;
                    fs.writeFileSync(p, JSON.stringify(localDb, null, 2));
                    return true;
                } catch (e) { return false; }
            },
            getFileSummary: async (u, r, p) => {
                const key = `${u}/${r}`;
                return db.repos?.[key]?.files?.[p] || null;
            },
            setFileSummary: async (u, r, p, sha, summary, content) => {
                const key = `${u}/${r}`;
                if (!db.repos[key]) db.repos[key] = { files: {}, lastUpdated: null };
                if (!db.repos[key].files) db.repos[key].files = {};

                db.repos[key].files[p] = {
                    sha,
                    summary,
                    summary,
                    contentSnippet: content ? content.substring(0, 500) : null,
                    aiSnippet: content ? content.substring(0, 3000) : null, // AI / Offline Context
                    analyzedAt: new Date().toISOString()
                };
                db.repos[key].lastUpdated = new Date().toISOString();
                this._saveDb();
                return true;
            },
            needsUpdate: async (u, r, p, currentSha) => {
                const cached = db.repos?.[`${u}/${r}`]?.files?.[p];
                if (!cached) return true;
                return cached.sha !== currentSha;
            },
            getRepoTreeSha: async (u, r) => {
                return db.repos?.[`${u}/${r}`]?.treeSha || null;
            },
            setRepoTreeSha: async (u, r, sha) => {
                const key = `${u}/${r}`;
                if (!db.repos[key]) db.repos[key] = { files: {}, lastUpdated: null };
                db.repos[key].treeSha = sha;
                db.repos[key].lastUpdated = new Date().toISOString();
                this._saveDb();
                return true;
            },
            hasRepoChanged: async (u, r, sha) => {
                return db.repos?.[`${u}/${r}`]?.treeSha !== sha;
            },
            getStats: async () => ({ repoCount: Object.keys(db.repos || {}).length, fileCount: 0, auditEntries: 0 })
        };
    }
}
