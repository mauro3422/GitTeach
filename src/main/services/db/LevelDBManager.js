
import { ClassicLevel } from 'classic-level';
import fs from 'fs';
import path from 'path';

/**
 * LevelDBManager - High-performance LSM-Tree Persistence
 * wrapper around 'classic-level'
 */
export class LevelDBManager {
    constructor(dbPath) {
        this.dbPath = dbPath;
        // Ensure parent dir exists
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });

        this.db = new ClassicLevel(dbPath, { valueEncoding: 'json' });
        this.status = 'closed';
    }

    async open() {
        if (this.status === 'open') return;
        try {
            await this.db.open();
            this.status = 'open';
            console.log(`[LevelDB] Database opened at ${this.dbPath}`);
        } catch (error) {
            console.error(`[LevelDB] Failed to open database:`, error);
            throw error;
        }
    }

    async close() {
        if (this.status === 'closed') return;
        await this.db.close();
        this.status = 'closed';
    }

    // --- PRIMITIVES ---

    async put(key, value) {
        return this.db.put(key, value);
    }

    async get(key) {
        try {
            return await this.db.get(key);
        } catch (error) {
            if (error.code === 'LEVEL_NOT_FOUND') return null;
            throw error;
        }
    }

    async del(key) {
        return this.db.del(key);
    }

    async batch(ops) {
        // ops = [{ type: 'put', key, value }, { type: 'del', key }]
        return this.db.batch(ops);
    }

    // --- STREAMING / ITERATION ---

    /**
     * Iterate over keys/values with optional prefix
     */
    async *iterator(options = {}) {
        // options: { gte: 'startKey', lte: 'endKey', limit: 100, reverse: false }
        for await (const [key, value] of this.db.iterator(options)) {
            yield { key, value };
        }
    }

    async getByPrefix(prefix) {
        const results = [];
        // 'gte' = prefix, 'lte' = prefix + \xFF (lexicographical end)
        for await (const entry of this.iterator({ gte: prefix, lte: prefix + '\xFF' })) {
            results.push(entry);
        }
        return results;
    }
}
