import fs from 'fs';
import path from 'path';
import { MOCK_PERSISTENCE_PATH } from './TracerContext.js';

/**
 * PersistenceMock - Simulates CacheAPI and FS persistence
 * 
 * Responsabilidad: Proveer window.cacheAPI inyectando datos en
 * la carpeta de sesión mock_persistence.
 */

export class PersistenceMock {
    static createAPI() {
        return {
            setWorkerAudit: async (workerId, finding) => {
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
            setTechnicalIdentity: async (u, data) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'technical_identity.json');
                    let db = {};
                    if (fs.existsSync(p)) db = JSON.parse(fs.readFileSync(p, 'utf8'));
                    db[u] = { identity: data, updatedAt: new Date().toISOString() };
                    fs.writeFileSync(p, JSON.stringify(db, null, 2));
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
                    let db = {};
                    if (fs.existsSync(p)) db = JSON.parse(fs.readFileSync(p, 'utf8'));
                    db[u] = { evidence: data, updatedAt: new Date().toISOString() };
                    fs.writeFileSync(p, JSON.stringify(db, null, 2));
                    return true;
                } catch (e) { return false; }
            },
            getCognitiveProfile: async (u) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'cognitive_profile.json');
                    if (fs.existsSync(p)) {
                        const db = JSON.parse(fs.readFileSync(p, 'utf8'));
                        return db[u] || null;
                    }
                } catch (e) { }
                return null;
            },
            setCognitiveProfile: async (u, data) => {
                try {
                    const p = path.join(MOCK_PERSISTENCE_PATH, 'cognitive_profile.json');
                    let db = {};
                    if (fs.existsSync(p)) db = JSON.parse(fs.readFileSync(p, 'utf8'));
                    db[u] = data;
                    fs.writeFileSync(p, JSON.stringify(db, null, 2));
                    return true;
                } catch (e) { return false; }
            },
            getFileSummary: async () => null,
            setFileSummary: async () => true,
            needsUpdate: async () => true,
            getRepoTreeSha: async () => null,
            setRepoTreeSha: async () => true,
            getCacheStats: async () => ({ size: 0, files: 0 })
        };
    }
}
