/**
 * DebugLogger - Orchestrator for forensic logging
 * Reduced to a facade that manages specialized modules.
 */
import { LoggerTransport, LoggerSession, LogCollectors } from './logger/index.js';

class DebugLoggerService {
    constructor() {
        this.enabled = false;
        this.transport = new LoggerTransport();
        this.session = new LoggerSession(this.transport);
        this.collectors = new LogCollectors(this.transport, this.session);
    }

    get sessionPath() { return this.session.sessionPath; }
    get sessionId() { return this.session.sessionId; }

    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`[DebugLogger] ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    async startSession() {
        if (!this.enabled) return null;
        await this.transport.init();
        return await this.session.start();
    }

    async logWorker(id, data) { if (this.enabled && this.sessionId) await this.collectors.logWorker(id, data); }
    async logCacheHit(path, data) { if (this.enabled && this.sessionId) await this.collectors.logCache(path, data); }
    async logCurator(phase, data) { if (this.enabled && this.sessionId) await this.collectors.logCurator(phase, data); }
    async logChat(type, msg) { if (this.enabled && this.sessionId) await this.collectors.logChat(type, msg); }
    async logMemory(cache, ctx) { if (this.enabled && this.sessionId) await this.collectors.logMemory(cache, ctx); }
    async logContextEvolution(data) { if (this.enabled && this.sessionId) await this.collectors.logContextEvolution(data); }

    async endSession() {
        if (!this.enabled || !this.sessionId) return null;
        return this.session.end();
    }

    getSessionPath() { return this.sessionPath; }
    isActive() { return this.enabled && this.sessionId !== null; }
}

export const DebugLogger = new DebugLoggerService();

if (typeof window !== 'undefined') {
    window.DebugLogger = DebugLogger;
}
