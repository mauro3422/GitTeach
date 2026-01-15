/**
 * LogCollectors - Domain-specific formatters and writers
 */
export class LogCollectors {
    constructor(transport, session) {
        this.transport = transport;
        this.session = session;
    }

    get sid() { return this.session.sessionId; }
    get spath() { return this.session.sessionPath; }

    async logWorker(workerId, data) {
        const entry = { timestamp: new Date().toISOString(), workerId, ...data };
        await this.transport.writeLog(this.sid, this.spath, 'workers', `worker_${workerId}.jsonl`, JSON.stringify(entry) + '\n');
    }

    async logCache(filePath, data) {
        const entry = { timestamp: new Date().toISOString(), filePath, ...data };
        await this.transport.writeLog(this.sid, this.spath, 'cache', 'cache_hits.jsonl', JSON.stringify(entry) + '\n');
    }

    async logCurator(phase, data) {
        const entry = { timestamp: new Date().toISOString(), phase, data };
        await this.transport.writeLog(this.sid, this.spath, 'curator', `${phase}.json`, JSON.stringify(entry, null, 2), true);
    }

    async logChat(type, message) {
        const entry = { timestamp: new Date().toISOString(), type, message };
        await this.transport.writeLog(this.sid, this.spath, 'chat', 'session.jsonl', JSON.stringify(entry) + '\n');
    }

    async logMemory(cacheState, contextState) {
        const snapshot = { timestamp: new Date().toISOString(), cache: cacheState, context: contextState };
        await this.transport.writeLog(this.sid, this.spath, 'memory', 'snapshot.json', JSON.stringify(snapshot, null, 2), true);
    }
}
