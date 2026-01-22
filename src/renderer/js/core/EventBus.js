/**
 * EventBus.js
 * Sistema de eventos centralizado (Pub/Sub) para desacoplar componentes.
 * Soporta namespaces, wildcards y middlewares.
 */

export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.middlewares = [];
    }

    /**
     * Registra un middleware que interceptará todos los eventos.
     * @param {Function} middlewareFn - (channel, data) => void
     */
    use(middlewareFn) {
        this.middlewares.push(middlewareFn);
    }

    /**
     * Suscribe un callback a un canal o patrón.
     * @param {string} channel - Nombre del evento (e.g., 'node:selected')
     * @param {Function} callback - Función a ejecutar
     * @returns {Function} Función para desuscribirse (unsubscribe)
     */
    on(channel, callback) {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, new Set());
        }
        this.listeners.get(channel).add(callback);

        // Retorna función de limpieza
        return () => this.off(channel, callback);
    }

    /**
     * Suscripción de una sola vez.
     */
    once(channel, callback) {
        const wrapper = (...args) => {
            this.off(channel, wrapper);
            callback(...args);
        };
        this.on(channel, wrapper);
    }

    /**
     * Elimina una suscripción.
     */
    off(channel, callback) {
        if (this.listeners.has(channel)) {
            this.listeners.get(channel).delete(callback);
            if (this.listeners.get(channel).size === 0) {
                this.listeners.delete(channel);
            }
        }
    }

    /**
     * Emite un evento a todos los suscriptores.
     * @param {string} channel - Nombre del evento
     * @param {any} data - Datos asociados al evento
     */
    emit(channel, data) {
        // 1. Ejecutar middlewares
        this.middlewares.forEach(mw => {
            try {
                mw(channel, data);
            } catch (err) {
                console.error(`[EventBus] Middleware error for ${channel}:`, err);
            }
        });

        // 2. Notificar listeners directos
        if (this.listeners.has(channel)) {
            this.listeners.get(channel).forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`[EventBus] Error in listener for ${channel}:`, err);
                }
            });
        }

        // 3. Notificar listeners globales o wildcards (si se implementan en el futuro)
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(cb => cb({ channel, data }));
        }
    }

    /**
     * Limpia todos los listeners (útil para tests o reset)
     */
    clear() {
        this.listeners.clear();
        this.middlewares = [];
    }
}

// Instancia global por defecto
export const globalEventBus = new EventBus();
