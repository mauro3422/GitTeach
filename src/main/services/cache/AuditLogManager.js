import path from 'path';
import { FileStorage } from './FileStorage.js';

/**
 * AuditLogManager - Handles worker JSONL audit trails
 */
export class AuditLogManager {
    constructor(workersDir) {
        this.workersDir = workersDir;
    }

    getWorkerName(workerId) {
        let name = workerId;
        if (typeof workerId === 'string') {
            const upper = workerId.toUpperCase();
            if (upper.includes('BACK') || upper.includes('ROOM')) name = 'BACKGROUND';
        }
        return name;
    }

    appendFinding(workerId, finding) {
        const name = this.getWorkerName(workerId);
        const filePath = path.join(this.workersDir, `worker_${name}.jsonl`);
        const entry = { ...finding, timestamp: new Date().toISOString() };
        FileStorage.appendLine(filePath, JSON.stringify(entry));
    }

    getAudit(workerId) {
        const name = this.getWorkerName(workerId);
        const filePath = path.join(this.workersDir, `worker_${name}.jsonl`);
        return FileStorage.readLines(filePath);
    }
}
