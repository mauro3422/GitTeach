/**
 * DebugLogger - File-based debug logging for AI flow analysis
 * Complements logger.js (terminal) with persistent file logging
 * 
 * Usage:
 *   DebugLogger.startSession();
 *   DebugLogger.logWorker(workerId, { input, prompt, output });
 *   DebugLogger.logCurator('mapper', inputData, outputData);
 */

class DebugLoggerService {
    constructor() {
        this.enabled = false;
        this.sessionPath = null;
        this.sessionId = null;
        this.isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
        if (this.isNode) {
            import('fs').then(fs => this.fs = fs);
            import('path').then(path => this.path = path);
        }
    }

    getDebugAPI() {
        if (typeof window !== 'undefined' && window.debugAPI) return window.debugAPI;
        if (typeof global !== 'undefined' && global.window && global.window.debugAPI) return global.window.debugAPI;
        return null; // Fallback to FS in Node
    }

    /**
     * Enable/disable debug logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`[DebugLogger] ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Start a new debug session - creates folder structure
     * @returns {Promise<string>} Session path
     */
    async startSession() {
        if (!this.enabled) {
            console.log('[DebugLogger] Not enabled, skipping session start');
            return null;
        }

        if (this.isNode && !this.fs) {
            try {
                this.fs = await import('fs');
                this.path = await import('path');
            } catch (e) {
                console.error('[DebugLogger] Failed to load native modules:', e);
            }
        }

        this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');

        // Use IPC to create folders in main process (renderer can't write to filesystem)
        const debugAPI = this.getDebugAPI();
        if (debugAPI?.createSession) {
            const result = await debugAPI.createSession(this.sessionId);
            if (result.success) {
                this.sessionPath = result.path;
                console.log(`[DebugLogger] Session started: ${this.sessionPath}`);
                return this.sessionPath;
            }
        } else if (this.isNode && this.fs && this.path) {
            // NODE.JS DIRECT WRITE FALLBACK
            const ROOT = process.cwd();
            this.sessionPath = this.path.join(ROOT, 'logs', 'sessions', this.sessionId);
            this.fs.mkdirSync(this.sessionPath, { recursive: true });
            console.log(`[DebugLogger] Session started (Direct FS): ${this.sessionPath}`);
            return this.sessionPath;
        }

        // Fallback: store in memory and log to console
        console.warn('[DebugLogger] IPC not available, using memory-only mode');
        this.sessionPath = `DEBUG_SESSION_${this.sessionId}`;
        this._memoryStore = {
            workers: {},
            curator: {},
            chat: [],
            memory: {}
        };
        return this.sessionPath;
    }

    /**
     * Log worker processing data
     * @param {number} workerId - Worker ID
     * @param {Object} data - { input, prompt, output, error? }
     */
    async logWorker(workerId, data) {
        // SILENCED: was console.error but this is not an error, just verbose logging
        // console.error(`[DebugLogger] logWorker ENTER: Worker ${workerId}...`);
        if (!this.enabled || !this.sessionPath) {
            // Silent skip - no need to log every skip
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            workerId,
            ...data
        };

        const debugAPI = this.getDebugAPI();
        if (debugAPI?.appendLog) {
            await debugAPI.appendLog(
                this.sessionId,
                'workers',
                `worker_${workerId}.jsonl`,
                JSON.stringify(logEntry) + '\n'
            );
        } else if (this.isNode && this.fs && this.path && this.sessionPath) {
            // NODE.JS DIRECT WRITE FALLBACK
            try {
                const dir = this.path.join(this.sessionPath, 'workers');
                if (!this.fs.existsSync(dir)) this.fs.mkdirSync(dir, { recursive: true });
                const fullPath = this.path.join(dir, `worker_${workerId}.jsonl`);
                this.fs.appendFileSync(fullPath, JSON.stringify(logEntry) + '\n');
            } catch (e) {
                console.error(`[DebugLogger] LOG WORKER ERROR: ${e.message}`);
            }
        } else if (this._memoryStore) {
            if (!this._memoryStore.workers[workerId]) {
                this._memoryStore.workers[workerId] = [];
            }
            this._memoryStore.workers[workerId].push(logEntry);
        }
    }

    /**
     * Log cache hit data
     * @param {string} filePath - Path of the cached file
     * @param {Object} data - { hit: boolean, key: string, value: any }
     */
    async logCacheHit(filePath, data) {
        if (!this.enabled || !this.sessionPath) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            filePath,
            ...data
        };

        const debugAPI = this.getDebugAPI();
        if (debugAPI?.appendLog) {
            await debugAPI.appendLog(
                this.sessionId,
                'cache',
                'cache_hits.jsonl',
                JSON.stringify(logEntry) + '\n'
            );
        } else if (this.isNode && this.fs && this.path && this.sessionPath) {
            // NODE.JS DIRECT WRITE FALLBACK
            try {
                const dir = this.path.join(this.sessionPath, 'cache');
                if (!this.fs.existsSync(dir)) this.fs.mkdirSync(dir, { recursive: true });
                const fullPath = this.path.join(dir, 'cache_hits.jsonl');
                this.fs.appendFileSync(fullPath, JSON.stringify(logEntry) + '\n');
            } catch (e) {
                console.error(`[DebugLogger] FS WRITE ERROR: ${e.message}`, e);
            }
        } else if (this._memoryStore) {
            // Assuming _memoryStore.cache is an array for cache hits
            this._memoryStore.cache.push(logEntry);
            console.log(`[DebugLogger] Cache Hit: ${filePath}`, logEntry);
        }
    }

    /**
     * Log curator phase data
     * @param {string} phase - 'mapper_input', 'mapper_output', 'reducer_input', 'reducer_output'
     * @param {any} data - Phase data
     */
    async logCurator(phase, data) {
        if (!this.enabled || !this.sessionPath) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            phase,
            data
        };

        const debugAPI = this.getDebugAPI();
        if (debugAPI?.appendLog) {
            await debugAPI.appendLog(
                this.sessionId,
                'curator',
                `${phase}.json`,
                JSON.stringify(logEntry, null, 2)
            );
        } else if (this.isNode && this.fs && this.path && this.sessionPath) {
            try {
                const dir = this.path.join(this.sessionPath, 'curator');
                if (!this.fs.existsSync(dir)) this.fs.mkdirSync(dir, { recursive: true });
                const fullPath = this.path.join(dir, `${phase}.json`);
                this.fs.writeFileSync(fullPath, JSON.stringify(logEntry, null, 2));
            } catch (e) {
                console.error(`[DebugLogger] LOG CURATOR ERROR: ${e.message}`);
            }
        } else if (this._memoryStore) {
            this._memoryStore.curator[phase] = logEntry;
            console.log(`[DebugLogger] Curator ${phase}:`, logEntry);
        }
    }

    /**
     * Log chat message
     * @param {string} type - 'user' or 'ai'
     * @param {string} message - Message content
     */
    async logChat(type, message) {
        if (!this.enabled || !this.sessionPath) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            message
        };

        const debugAPI = this.getDebugAPI();
        if (debugAPI?.appendLog) {
            await debugAPI.appendLog(
                this.sessionId,
                'chat',
                'session.jsonl',
                JSON.stringify(logEntry) + '\n'
            );
        } else if (this.isNode && this.fs && this.path && this.sessionPath) {
            try {
                const dir = this.path.join(this.sessionPath, 'chat');
                if (!this.fs.existsSync(dir)) this.fs.mkdirSync(dir, { recursive: true });
                const fullPath = this.path.join(dir, 'session.jsonl');
                this.fs.appendFileSync(fullPath, JSON.stringify(logEntry) + '\n');
            } catch (e) {
                console.error(`[DebugLogger] LOG CHAT ERROR: ${e.message}`);
            }
        } else if (this._memoryStore) {
            this._memoryStore.chat.push(logEntry);
            console.log(`[DebugLogger] Chat ${type}:`, message.substring(0, 100));
        }
    }

    /**
     * Log memory/cache state snapshot
     * @param {Object} cacheState - Current cache state
     * @param {Object} contextState - Current context state
     */
    async logMemory(cacheState, contextState) {
        if (!this.enabled || !this.sessionPath) return;

        const snapshot = {
            timestamp: new Date().toISOString(),
            cache: cacheState,
            context: contextState
        };

        const debugAPI = this.getDebugAPI();
        if (debugAPI?.appendLog) {
            await debugAPI.appendLog(
                this.sessionId,
                'memory',
                'snapshot.json',
                JSON.stringify(snapshot, null, 2)
            );
        } else if (this.isNode && this.fs && this.path && this.sessionPath) {
            try {
                const dir = this.path.join(this.sessionPath, 'memory');
                if (!this.fs.existsSync(dir)) this.fs.mkdirSync(dir, { recursive: true });
                const fullPath = this.path.join(dir, 'snapshot.json');
                this.fs.writeFileSync(fullPath, JSON.stringify(snapshot, null, 2));
            } catch (e) {
                console.error(`[DebugLogger] LOG MEMORY ERROR: ${e.message}`);
            }
        } else if (this._memoryStore) {
            this._memoryStore.memory = snapshot;
            console.log(`[DebugLogger] Memory snapshot saved`);
        }
    }

    /**
     * End session and return summary
     */
    async endSession() {
        if (!this.enabled || !this.sessionPath) return null;

        const summary = {
            sessionId: this.sessionId,
            sessionPath: this.sessionPath,
            endTime: new Date().toISOString()
        };

        if (this._memoryStore) {
            summary.inMemory = true;
            summary.workerCount = Object.keys(this._memoryStore.workers).length;
            summary.chatMessages = this._memoryStore.chat.length;
            console.log('[DebugLogger] Session ended (memory mode):', summary);
        } else {
            console.log(`[DebugLogger] Session ended: ${this.sessionPath}`);
        }

        return summary;
    }

    /**
     * Get current session path
     */
    getSessionPath() {
        return this.sessionPath;
    }

    /**
     * Check if logging is active
     */
    isActive() {
        return this.enabled && this.sessionPath !== null;
    }
}

// Singleton export
export const DebugLogger = new DebugLoggerService();

// Global access for debugging
if (typeof window !== 'undefined') {
    window.DebugLogger = DebugLogger;
}
