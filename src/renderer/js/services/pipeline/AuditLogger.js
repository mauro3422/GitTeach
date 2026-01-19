/**
 * AuditLogger - Persiste eventos de pipeline a JSONL para análisis forense
 */
import { pipelineEventBus } from './PipelineEventBus.js';

export class AuditLogger {
    constructor() {
        this.buffer = [];
        this.flushInterval = 5000; // Flush cada 5 segundos
        this.maxBufferSize = 100;
        this.sessionId = Date.now().toString(36);
    }

    start() {
        // Subscribirse a todos los eventos
        this.unsubscribe = pipelineEventBus.on('*', (event) => {
            this.buffer.push(event);

            if (this.buffer.length >= this.maxBufferSize) {
                this.flush();
            }
        });

        // Flush periódico
        this.timer = setInterval(() => this.flush(), this.flushInterval);

        console.log(`[AuditLogger] Started for session ${this.sessionId}`);
    }

    async flush() {
        if (this.buffer.length === 0) return;

        const batch = [...this.buffer];
        this.buffer = [];

        try {
            if (window.debugAPI) {
                for (const event of batch) {
                    await window.debugAPI.appendLog(
                        this.sessionId,
                        'pipeline',
                        `trace_${Date.now()}.jsonl`,
                        JSON.stringify(event) + '\n'
                    );
                }
            }
        } catch (error) {
            console.warn('[AuditLogger] Flush failed:', error);
            // Re-add to buffer for retry
            this.buffer.unshift(...batch);
        }
    }

    stop() {
        if (this.unsubscribe) this.unsubscribe();
        if (this.timer) clearInterval(this.timer);
        this.flush(); // Final flush
    }
}

export const auditLogger = new AuditLogger();
export default auditLogger;
