/**
 * LogManager - Centralized logging system for GitTeach
 * Replaces scattered console.log usage with structured logging
 *
 * SOLID Principles:
 * - S: Single responsibility for all logging operations
 * - O: Extensible transport system (console, file, network)
 * - L: Substitutable interface for different environments
 * - I: Clean logging interface
 * - D: Depends only on configuration
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    SILENT: 4
};

// Transport interface
class LogTransport {
    log(level, message, context) {
        throw new Error('LogTransport.log() must be implemented by subclass');
    }
}

// Console transport for development and Tracer
class ConsoleTransport extends LogTransport {
    log(level, message, context) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
        const levelName = Object.keys(LOG_LEVELS)[level];
        const icon = this._getIcon(levelName, context?.component);

        let formatted = `${icon} [${timestamp}] ${levelName}`;
        if (context?.component) {
            formatted += ` (${context.component})`;
        }
        formatted += `: ${message}`;

        if (context && Object.keys(context).length > (context.component ? 1 : 0)) {
            // Remove component from context for clean object logging
            const { component, ...rest } = context;
            console.log(formatted, rest);
        } else {
            console.log(formatted);
        }
    }

    _getIcon(level, component) {
        if (level === 'ERROR') return '❌';
        if (level === 'WARN') return '⚠️';

        const componentIcons = {
            'ResultProcessor': '🔧',
            'MemoryManager': '🧠',
            'StateCoordinator': '🏗️',
            'SynthesisOrchestrator': '🎼',
            'DeepCurator': '🧬',
            'AIService': '🤖',
            'Tracer': '🧬'
        };

        return componentIcons[component] || '📝';
    }
}

// File transport for production logging
class FileTransport extends LogTransport {
    constructor() {
        super();
        this.logs = [];
        this.maxLogs = 1000;
    }

    log(level, message, context) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: Object.keys(LOG_LEVELS)[level],
            message,
            context
        };

        this.logs.push(entry);

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // In browser environment, store in localStorage as fallback
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('giteach_logs', JSON.stringify(this.logs.slice(-100)));
            } catch (e) {
                // Ignore localStorage errors
            }
        }
    }

    getLogs() {
        return this.logs;
    }
}

// Main LogManager class
export class LogManager {
    constructor() {
        this.transports = [];
        this.minLevel = LOG_LEVELS.DEBUG;
        this.context = {};

        // Add console transport by default in development OR Tracer
        const isTracer = typeof window !== 'undefined' && window.IS_TRACER;
        const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

        if (isDev || isTracer) {
            this.addTransport(new ConsoleTransport());
        }

        // Add file transport for audit trail
        this.addTransport(new FileTransport());
    }

    /**
     * Add a logging transport
     */
    addTransport(transport) {
        this.transports.push(transport);
    }

    /**
     * Set minimum log level
     */
    setMinLevel(level) {
        this.minLevel = LOG_LEVELS[level] || LOG_LEVELS.DEBUG;
    }

    /**
     * Set global context for all logs
     */
    setContext(context) {
        this.context = { ...this.context, ...context };
    }

    /**
     * Internal logging method
     */
    _log(level, message, context = {}) {
        if (level < this.minLevel) return;

        const fullContext = { ...this.context, ...context };

        this.transports.forEach(transport => {
            try {
                transport.log(level, message, fullContext);
            } catch (e) {
                // Fallback to console if transport fails
                console.error('LogManager transport error:', e);
            }
        });
    }

    /**
     * Debug level logging
     */
    debug(message, context) {
        this._log(LOG_LEVELS.DEBUG, message, context);
    }

    /**
     * Info level logging
     */
    info(message, context) {
        this._log(LOG_LEVELS.INFO, message, context);
    }

    /**
     * Warning level logging
     */
    warn(message, context) {
        this._log(LOG_LEVELS.WARN, message, context);
    }

    /**
     * Error level logging
     */
    error(message, context) {
        this._log(LOG_LEVELS.ERROR, message, context);
    }

    /**
     * Create child logger with fixed context
     */
    child(fixedContext) {
        const child = Object.create(this);
        child.context = { ...this.context, ...fixedContext };
        return child;
    }

    /**
     * Get audit logs for debugging
     */
    getAuditLogs() {
        const fileTransport = this.transports.find(t => t instanceof FileTransport);
        return fileTransport ? fileTransport.getLogs() : [];
    }
}

// Singleton instance
export const logManager = new LogManager();

// Convenience functions for backward compatibility
export const logger = {
    debug: (msg, ctx) => logManager.debug(msg, ctx),
    info: (msg, ctx) => logManager.info(msg, ctx),
    warn: (msg, ctx) => logManager.warn(msg, ctx),
    error: (msg, ctx) => logManager.error(msg, ctx)
};
