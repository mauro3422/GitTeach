import fs from 'fs';
import path from 'path';
import { MOCK_PERSISTENCE_PATH } from './TracerContext.js';

/**
 * PersistenceMock - Simulates CacheAPI using LevelDB (or Memory Fallback)
 * Aligning Tracer with Production Architecture
 */

let dbInstance = null;
let useMemoryFallback = true;
const memoryStore = new Map();

export class PersistenceMock {
    static async _getDb() {
        if (dbInstance) return dbInstance;
        if (useMemoryFallback) return this._getMemoryDb();

        const dbPath = path.join(MOCK_PERSISTENCE_PATH, 'leveldb_mock');

        try {
            // Dynamic import to avoid LinkError if classic-level is incompatible
            const { LevelDBManager } = await import('../../../src/main/services/db/LevelDBManager.js');
            dbInstance = new LevelDBManager(dbPath);
            await dbInstance.open();
            return dbInstance;
        } catch (e) {
            console.warn("⚠️ [PersistenceMock] LevelDB failed to load (likely ABI mismatch). Using Memory Fallback.", e.message);
            useMemoryFallback = true;
            return this._getMemoryDb();
        }
    }

    static _getMemoryDb() {
        return {
            put: async (k, v) => memoryStore.set(k, v),
            get: async (k) => memoryStore.get(k),
            del: async (k) => memoryStore.delete(k),
            batch: async (ops) => ops.forEach(op => op.type === 'put' ? memoryStore.set(op.key, op.value) : memoryStore.delete(op.key)),
            getByPrefix: async (prefix) => Array.from(memoryStore.entries())
                .filter(([k]) => k.startsWith(prefix))
                .map(([k, v]) => ({ key: k, value: v }))
        };
    }

    static _ensureRepoDir(repoName) {
        if (!repoName) return null;
        const repoDir = path.join(MOCK_PERSISTENCE_PATH, 'repos', repoName);
        if (!fs.existsSync(repoDir)) {
            fs.mkdirSync(repoDir, { recursive: true });
        }
        return repoDir;
    }

    static createAPI() {
        // Ensure DB is initialized (async, but createAPI is sync usually)
        // We handle this by making the returned methods async and waiting for db init inside them.

        const getDb = async () => {
            return await this._getDb();
        };

        return {
            // --- WORKER LOGS ---
            appendWorkerLog: async (workerId, finding) => {
                const db = await getDb();
                const timestamp = new Date().toISOString();
                const rand = Math.random().toString(36).substring(7);
                const key = `log:worker:${workerId}:${timestamp}:${rand}`;
                await db.put(key, finding);
                return true;
            },
            getWorkerAudit: async () => [],

            // --- IDENTITY ---
            getTechnicalIdentity: async (u) => {
                const db = await getDb();
                return await db.get(`meta:identity:${u}`);
            },
            setTechnicalIdentity: async (u, data) => {
                const db = await getDb();
                const key = `meta:identity:${u}`; // 'u' might be complex key from LayeredPersistenceManager
                await db.put(key, data);

                // GLOBAL LAYER MIRRORING (Visibility)
                try {
                    // Check if this is a Layer (Theme or Metric)
                    // Format from LayeredPersistenceManager: "theme:architecture:mauro" or "metrics:versatility:mauro"
                    if (u.includes('theme:') || u.includes('metrics:') || u.includes('tech_radar')) {
                        const globalLayersDir = path.join(MOCK_PERSISTENCE_PATH, 'mappers', 'outputs');
                        if (!fs.existsSync(globalLayersDir)) fs.mkdirSync(globalLayersDir, { recursive: true });

                        // Sanitize filename (replace colons)
                        const safeName = u.replace(/:/g, '_').replace(data.username || 'user', '') + '.json';
                        fs.writeFileSync(path.join(globalLayersDir, safeName), JSON.stringify(data, null, 2));

                        // HISTORY / EVOLUTION (Time Travel)
                        try {
                            const historyDir = path.join(MOCK_PERSISTENCE_PATH, 'mappers', 'history');
                            const category = u.split(':')[1] || 'general'; // architecture, habits, etc.
                            const categoryDir = path.join(historyDir, category); // Organized by category

                            if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

                            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
                            const historyName = `${timestamp}_${safeName}`;
                            fs.writeFileSync(path.join(categoryDir, historyName), JSON.stringify(data, null, 2));
                        } catch (histErr) { /* ignore history errors */ }
                    }
                    // Main Context User (when 'u' is just username and data has 'bio')
                    else if (data.bio && data.traits) {
                        fs.writeFileSync(path.join(MOCK_PERSISTENCE_PATH, 'context_user.json'), JSON.stringify(data, null, 2));
                    }
                } catch (e) { }

                return true;
            },

            getTechnicalFindings: async (u) => {
                const db = await getDb();
                return await db.get(`meta:findings:${u}`);
            },
            setTechnicalFindings: async (u, data) => {
                const db = await getDb();
                await db.put(`meta:findings:${u}`, data);
                return true;
            },

            getCognitiveProfile: async (u) => {
                const db = await getDb();
                return await db.get(`meta:profile:${u}`);
            },
            setCognitiveProfile: async (u, data) => {
                const db = await getDb();
                await db.put(`meta:profile:${u}`, data);
                return true;
            },

            // --- REPO CACHE / FILE SUMMARIES ---
            getFileSummary: async (u, r, p) => {
                const db = await getDb();
                return await db.get(`raw:file:${r}:${p}`);
            },
            setFileSummary: async (u, r, p, sha, summary, content, fileMeta = {}) => {
                const db = await getDb();
                const key = `raw:file:${r}:${p}`;
                const data = {
                    content,
                    summary,
                    meta: { sha, ...fileMeta },
                    updatedAt: new Date().toISOString()
                };
                await db.put(key, data);
                return true;
            },
            needsUpdate: async (u, r, p, currentSha) => {
                const db = await getDb();
                const cached = await db.get(`raw:file:${r}:${p}`);
                if (!cached) return true;
                return cached.meta?.sha !== currentSha;
            },

            getRepoTreeSha: async (u, r) => {
                const db = await getDb();
                return await db.get(`meta:repo:tree:${u}:${r}`);
            },
            setRepoTreeSha: async (u, r, sha) => {
                const db = await getDb();
                await db.put(`meta:repo:tree:${u}:${r}`, sha);
                return true;
            },
            hasRepoChanged: async (u, r, sha) => {
                const db = await getDb();
                const stored = await db.get(`meta:repo:tree:${u}:${r}`);
                return stored !== sha;
            },

            getStats: async () => ({ type: 'LevelDB-Mock', status: 'open' }),

            // --- REPO CENTRIC V3 ---
            ensureRepoDir: async () => true, // No-op in LevelDB

            appendRepoRawFinding: async (repoName, finding) => {
                const db = await getDb();
                const timestamp = new Date().toISOString();
                const rand = Math.random().toString(36).substring(7);
                const key = `raw:finding:${repoName}:${timestamp}:${rand}`;
                await db.put(key, finding);

                // JSON Mirror
                try {
                    const repoDir = PersistenceMock._ensureRepoDir(repoName);
                    if (repoDir) {
                        const filePath = path.join(repoDir, 'raw_findings.jsonl');
                        fs.appendFileSync(filePath, JSON.stringify(finding) + '\n');
                    }
                } catch (e) { }

                return true;
            },

            persistRepoCuratedMemory: async (repoName, nodes) => {
                const db = await getDb();
                const ops = nodes.map(node => ({
                    type: 'put',
                    key: `mem:node:${node.uid}`,
                    value: node
                }));
                // Update index
                const indexKey = `idx:repo:${repoName}:nodes`;
                const existingIndex = (await db.get(indexKey)) || [];
                const newUids = nodes.map(n => n.uid);
                const combinedIndex = [...new Set([...existingIndex, ...newUids])];

                ops.push({
                    type: 'put',
                    key: indexKey,
                    value: combinedIndex
                });

                await db.batch(ops);

                // JSON Mirror
                try {
                    const repoDir = PersistenceMock._ensureRepoDir(repoName);
                    if (repoDir) {
                        const filePath = path.join(repoDir, 'curated_memory.json');
                        fs.writeFileSync(filePath, JSON.stringify(nodes, null, 2));
                    }
                } catch (e) { }

                return true;
            },

            persistRepoBlueprint: async (repoName, blueprint) => {
                const db = await getDb();
                await db.put(`meta:blueprint:${repoName}`, blueprint);

                // JSON Mirror
                try {
                    const repoDir = PersistenceMock._ensureRepoDir(repoName);
                    if (repoDir) {
                        const filePath = path.join(repoDir, 'blueprint.json');
                        fs.writeFileSync(filePath, JSON.stringify(blueprint, null, 2));
                    }
                } catch (e) { }

                return true;
            },

            getAllRepoBlueprints: async () => {
                const db = await getDb();
                const blueprints = await db.getByPrefix('meta:blueprint:');
                return blueprints.map(entry => entry.value);
            },

            persistRepoPartitions: async (repoName, partitions) => {
                const db = await getDb();
                await db.put(`meta:partitions:${repoName}`, partitions);

                // JSON Mirror
                try {
                    const repoDir = PersistenceMock._ensureRepoDir(repoName);
                    if (repoDir) {
                        const filePath = path.join(repoDir, 'partitions.json');
                        fs.writeFileSync(filePath, JSON.stringify(partitions, null, 2));
                    }
                } catch (e) { }

                return true;
            },

            // --- DEBUG / TRACER ---
            persistPartitionDebug: async (layer, data) => {
                try {
                    const debugDir = path.join(MOCK_PERSISTENCE_PATH, 'mappers', 'inputs');
                    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });

                    const filePath = path.join(debugDir, `${layer}_input.json`);
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                    return true;
                } catch (e) { return false; }
            },

            // Legacy methods that might be called
            getDeveloperDNA: async (u) => {
                const db = await getDb();
                return await db.get(`meta:identity:${u}`);
            }
        };
    }
}
