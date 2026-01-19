/**
 * LoggerSession - Manages session ID and directory lifecycle
 */
export class LoggerSession {
    constructor(transport) {
        this.transport = transport;
        this.sessionId = null;
        this.sessionPath = null;
    }

    async start(customSessionId = null) {
        this.sessionId = customSessionId || new Date().toISOString().replace(/[:.]/g, '-');
        const debugAPI = this.transport.getDebugAPI();

        if (debugAPI?.createSession) {
            const result = await debugAPI.createSession(this.sessionId);
            if (result.success) {
                this.sessionPath = result.path;
                return result.path;
            }
        } else if (this.transport.isNode && this.transport.fs) {
            const ROOT = typeof process !== 'undefined' ? process.cwd() : '.';
            this.sessionPath = this.transport.path.join(ROOT, 'logs', 'sessions', this.sessionId);
            this.transport.fs.mkdirSync(this.sessionPath, { recursive: true });
            return this.sessionPath;
        }

        this.sessionPath = `MEM_SESSION_${this.sessionId}`;
        return this.sessionPath;
    }

    end() {
        const summary = {
            sessionId: this.sessionId,
            sessionPath: this.sessionPath,
            endTime: new Date().toISOString()
        };
        console.log(`[LoggerSession] Session ended: ${this.sessionId}`);
        this.sessionId = null;
        this.sessionPath = null;
        return summary;
    }
}
