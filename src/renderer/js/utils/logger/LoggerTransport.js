/**
 * LoggerTransport - Abstraction layer for data output
 * Supports IPC (Renderer), FS (Node), and Memory (Fallback)
 */
export class LoggerTransport {
    constructor() {
        this.isNode = typeof process !== 'undefined' && process.versions?.node;
        this.fs = null;
        this.path = null;
        this._memoryStore = { workers: {}, curator: {}, chat: [], memory: {}, cache: [] };
    }

    async init() {
        if (this.isNode && !this.fs) {
            try {
                // Use default to avoid destructuring issues with some ESM loaders
                const fsModule = await import('fs');
                this.fs = fsModule.default || fsModule;
                const pathModule = await import('path');
                this.path = pathModule.default || pathModule;
            } catch (e) {
                console.error('[LoggerTransport] Failed to load native modules:', e);
            }
        }
    }

    getDebugAPI() {
        if (typeof window !== 'undefined' && window.debugAPI) return window.debugAPI;
        if (typeof global !== 'undefined' && global.window?.debugAPI) return global.window.debugAPI;
        return null;
    }

    async writeLog(sessionId, sessionPath, folder, file, content, isJson = false) {
        const debugAPI = this.getDebugAPI();

        // 1. IPC (Electron Renderer)
        if (debugAPI?.appendLog) {
            return await debugAPI.appendLog(sessionId, folder, file, content);
        }

        // 2. Direct FS (Node/Tracer)
        if (this.isNode && this.fs && this.path && sessionPath) {
            try {
                const dir = this.path.join(sessionPath, folder);
                if (!this.fs.existsSync(dir)) this.fs.mkdirSync(dir, { recursive: true });
                const fullPath = this.path.join(dir, file);

                if (isJson) {
                    this.fs.writeFileSync(fullPath, content);
                } else {
                    this.fs.appendFileSync(fullPath, content);
                }
                return true;
            } catch (e) {
                console.error(`[LoggerTransport] FS write error: ${e.message}`);
                return false;
            }
        }

        // 3. Memory Fallback
        this._memoryStore[folder] = this._memoryStore[folder] || [];
        this._memoryStore[folder].push({ file, content, timestamp: new Date().toISOString() });
        return true;
    }
}
