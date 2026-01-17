import fs from 'fs';
import path from 'path';
import { MOCK_PERSISTENCE_PATH } from './TracerContext.js';
import { LevelDBManager } from '../../../src/main/services/db/LevelDBManager.js';

/**
 * PersistenceMock - Simulates CacheAPI using LevelDB
 * Aligning Tracer with Production Architecture
 */

let dbInstance = null;

export class PersistenceMock {
    static async _getDb() {
        if (dbInstance) return dbInstance;

        const dbPath = path.join(MOCK_PERSISTENCE_PATH, 'leveldb_mock');
        dbInstance = new LevelDBManager(dbPath);
        await dbInstance.open();
        return dbInstance;
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
                await db.put(`meta:identity:${u}`, data);
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
                return true;
            },

            persistRepoBlueprint: async (repoName, blueprint) => {
                const db = await getDb();
                await db.put(`meta:blueprint:${repoName}`, blueprint);
                return true;
            },

            getAllRepoBlueprints: async () => {
                const db = await getDb();
                const blueprints = await db.getByPrefix('meta:blueprint:');
                return blueprints.map(entry => entry.value);
            },

            // Legacy methods that might be called
            getDeveloperDNA: async (u) => {
                const db = await getDb();
                return await db.get(`meta:identity:${u}`);
            }
        };
    }
}
