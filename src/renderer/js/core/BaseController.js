/**
 * BaseController.js
 * Clase abstracta que define el ciclo de vida de los componentes mayores.
 * Maneja la limpieza automática de recursos (eventos, timers).
 */

export class BaseController {
    constructor() {
        this.isMounted = false;
        this.disposables = [];
        this.timeouts = new Set();
        this.intervals = new Set();
    }

    /**
     * Initialization logic (runs once).
     * Override this, but ensure to call super.init() if needed.
     */
    init(config = {}) {
        this.config = config;
        this.log('Initialized');
    }

    /**
     * Mount logic (runs when component becomes active/visible).
     * Sets up DOM listeners, subscriptions, etc.
     */
    mount(container = null) {
        if (this.isMounted) return;
        this.isMounted = true;
        this.log('Mounted');
    }

    /**
     * Unmount logic (runs when component is hidden/inactive).
     * Cleans up transient resources.
     */
    unmount() {
        if (!this.isMounted) return;
        this.cleanupResources();
        this.isMounted = false;
        this.log('Unmounted');
    }

    /**
     * Full destruction (runs when component is removed forever).
     */
    destroy() {
        this.unmount();
        this.log('Destroyed');
    }

    // === Resource Management ===

    /**
     * Registra una función de limpieza (cleanup function).
     * @param {Function} fn - Función a ejecutar al desmontar.
     */
    registerDisposable(fn) {
        if (typeof fn !== 'function') {
            console.error('[BaseController] Disposable must be a function', fn);
            return;
        }
        this.disposables.push(fn);
    }

    /**
     * Wrapper seguro para setTimeout que se limpia automáticamente.
     */
    setTimeout(fn, ms) {
        const id = setTimeout(() => {
            this.timeouts.delete(id);
            fn();
        }, ms);
        this.timeouts.add(id);
        return id;
    }

    /**
     * Wrapper seguro para setInterval que se limpia automáticamente.
     */
    setInterval(fn, ms) {
        const id = setInterval(fn, ms);
        this.intervals.add(id);
        return id;
    }

    /**
     * Limpia todos los recursos registrados.
     */
    cleanupResources() {
        // Clear disposables (event listeners, subscriptions)
        this.disposables.forEach(fn => {
            try {
                fn();
            } catch (err) {
                console.error('[BaseController] Error cleaning up disposable:', err);
            }
        });
        this.disposables = [];

        // Clear timeouts
        this.timeouts.forEach(id => clearTimeout(id));
        this.timeouts.clear();

        // Clear intervals
        this.intervals.forEach(id => clearInterval(id));
        this.intervals.clear();
    }

    // === Helpers ===

    log(message, ...args) {
        // Placeholder for future Logger integration
        // console.log(`[${this.constructor.name}] ${message}`, ...args);
    }
}
