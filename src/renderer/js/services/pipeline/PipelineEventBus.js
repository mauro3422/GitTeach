/**
 * PipelineEventBus - Central hub for pipeline telemetry events
 *
 * Eventos soportados:
 * - embedding:start/end  → Puerto 8001
 * - ai:gpu:start/end     → Puerto 8000
 * - ai:cpu:start/end     → Puerto 8002
 * - mapper:start/end     → Puerto 8002
 * - file:queued/completed → Auditoría general
 */
export class PipelineEventBus {
    constructor() {
        this.listeners = new Map();  // event -> Set<callback>
        this.history = [];           // Últimos N eventos para debugging
        this.maxHistory = 100;
    }

    /**
     * Emitir un evento al bus
     */
    emit(event, payload) {
        const entry = {
            event,
            payload,
            timestamp: Date.now(),
            isoTime: new Date().toISOString()
        };

        // Guardar en historial
        this.history.push(entry);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Notificar a listeners locales
        const callbacks = this.listeners.get(event) || new Set();
        callbacks.forEach(cb => cb(entry));

        // Notificar a todos los listeners de "*"
        const wildcardCallbacks = this.listeners.get('*') || new Set();
        wildcardCallbacks.forEach(cb => cb(entry));

        // Enviar al Main Process via IPC para AIFleetService
        if (window.fleetAPI?.sendActivity) {
            window.fleetAPI.sendActivity(entry);
        }
    }

    /**
     * Subscribirse a eventos
     * @param {string} event - Nombre del evento o "*" para todos
     * @param {Function} callback
     * @returns {Function} Unsubscribe
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.listeners.get(event).delete(callback);
    }

    /**
     * Obtener historial reciente
     */
    getHistory(limit = 50) {
        return this.history.slice(-limit);
    }

    /**
     * Helper: Medir duración de una operación async
     */
    async measure(eventPrefix, payload, asyncFn) {
        this.emit(`${eventPrefix}:start`, payload);
        const startTime = Date.now();
        try {
            const result = await asyncFn();
            this.emit(`${eventPrefix}:end`, {
                ...payload,
                success: true,
                durationMs: Date.now() - startTime
            });
            return result;
        } catch (error) {
            this.emit(`${eventPrefix}:end`, {
                ...payload,
                success: false,
                error: error.message,
                durationMs: Date.now() - startTime
            });
            throw error;
        }
    }
}

export const pipelineEventBus = new PipelineEventBus();
export default pipelineEventBus;
