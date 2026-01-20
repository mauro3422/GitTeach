/**
 * RendererLogger - Unified logging interface for GitTeach renderer
 * Combines functionality from multiple logging systems:
 * - LoggerService (logger.js): Terminal and console logging
 * - LogManager (logManager.js): Structured logging with transports
 * - DebugLogger (debugLogger.js): Forensic session-based logging
 */

import { Logger } from './logger.js';
import { logManager } from './logManager.js';
import { DebugLogger } from './debugLogger.js';

// Map log levels to corresponding logger methods
const LOG_METHODS = {
    debug: {
        logger: (tag, message) => Logger.debug(tag, message),
        logManager: (message, context) => logManager.debug(message, context),
        debugLogger: (type, message) => DebugLogger.isActive() && DebugLogger[`log${type.charAt(0).toUpperCase() + type.slice(1)}`]?.(message)
    },
    info: {
        logger: (tag, message) => Logger.info(tag, message),
        logManager: (message, context) => logManager.info(message, context),
        debugLogger: (type, message) => DebugLogger.isActive() && DebugLogger[`log${type.charAt(0).toUpperCase() + type.slice(1)}`]?.(message)
    },
    warn: {
        logger: (tag, message) => Logger.warn(tag, message),
        logManager: (message, context) => logManager.warn(message, context),
        debugLogger: (type, message) => DebugLogger.isActive() && DebugLogger[`log${type.charAt(0).toUpperCase() + type.slice(1)}`]?.(message)
    },
    error: {
        logger: (tag, message) => Logger.error(tag, message),
        logManager: (message, context) => logManager.error(message, context),
        debugLogger: (type, message) => DebugLogger.isActive() && DebugLogger[`log${type.charAt(0).toUpperCase() + type.slice(1)}`]?.(message)
    }
};

class RendererLoggerService {
    constructor() {
        this.enabled = true;
        this.defaultTag = 'RENDERER';
        
        // Expose debug logger session management methods
        this.sessionPath = DebugLogger.sessionPath;
        this.sessionId = DebugLogger.sessionId;
    }

    /**
     * Enable/disable all logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        Logger.setEnabled(enabled);
    }

    /**
     * Set minimum log level for LoggerService
     */
    setLogLevel(level) {
        Logger.setMinLevel(level);
    }

    /**
     * Set minimum log level for LogManager
     */
    setManagerLogLevel(level) {
        logManager.setMinLevel(level);
    }

    /**
     * Enable/disable debug logging (forensic session logging)
     */
    setDebugLogging(enabled) {
        DebugLogger.setEnabled(enabled);
    }

    /**
     * Start a debug logging session
     */
    async startSession(sessionId = null) {
        return await DebugLogger.startSession(sessionId);
    }

    /**
     * End the current debug logging session
     */
    async endSession() {
        return await DebugLogger.endSession();
    }

    /**
     * Check if debug logging session is active
     */
    isDebugSessionActive() {
        return DebugLogger.isActive();
    }

    /**
     * Set global context for LogManager
     */
    setContext(context) {
        logManager.setContext(context);
    }

    /**
     * Unified debug method that delegates to all loggers
     */
    debug(message, options = {}) {
        if (!this.enabled) return;

        const { tag = this.defaultTag, context = {}, debugType = 'curator', debugData = {} } = options;
        
        // Call LoggerService
        LOG_METHODS.debug.logger(tag, message);
        
        // Call LogManager
        LOG_METHODS.debug.logManager(message, { ...context, logger: 'RendererLogger' });
        
        // Call DebugLogger if active
        if (DebugLogger.isActive()) {
            // Use the debugType to determine which debug logger method to call
            switch(debugType) {
                case 'worker':
                    DebugLogger.logWorker(debugData.id || 'unknown', { message, ...debugData });
                    break;
                case 'cache':
                    DebugLogger.logCacheHit(debugData.path || 'unknown', { message, ...debugData });
                    break;
                case 'curator':
                    DebugLogger.logCurator(debugData.phase || 'general', { message, ...debugData });
                    break;
                case 'chat':
                    DebugLogger.logChat(debugData.type || 'general', message);
                    break;
                case 'memory':
                    DebugLogger.logMemory(debugData.cache || {}, debugData.ctx || {});
                    break;
                case 'context':
                    DebugLogger.logContextEvolution({ message, ...debugData });
                    break;
                default:
                    DebugLogger.logCurator(debugType, { message, ...debugData });
            }
        }
    }

    /**
     * Unified info method that delegates to all loggers
     */
    info(message, options = {}) {
        if (!this.enabled) return;

        const { tag = this.defaultTag, context = {}, debugType = 'curator', debugData = {} } = options;
        
        // Call LoggerService
        LOG_METHODS.info.logger(tag, message);
        
        // Call LogManager
        LOG_METHODS.info.logManager(message, { ...context, logger: 'RendererLogger' });
        
        // Call DebugLogger if active
        if (DebugLogger.isActive()) {
            // Use the debugType to determine which debug logger method to call
            switch(debugType) {
                case 'worker':
                    DebugLogger.logWorker(debugData.id || 'unknown', { message, ...debugData });
                    break;
                case 'cache':
                    DebugLogger.logCacheHit(debugData.path || 'unknown', { message, ...debugData });
                    break;
                case 'curator':
                    DebugLogger.logCurator(debugData.phase || 'general', { message, ...debugData });
                    break;
                case 'chat':
                    DebugLogger.logChat(debugData.type || 'general', message);
                    break;
                case 'memory':
                    DebugLogger.logMemory(debugData.cache || {}, debugData.ctx || {});
                    break;
                case 'context':
                    DebugLogger.logContextEvolution({ message, ...debugData });
                    break;
                default:
                    DebugLogger.logCurator(debugType, { message, ...debugData });
            }
        }
    }

    /**
     * Unified warn method that delegates to all loggers
     */
    warn(message, options = {}) {
        if (!this.enabled) return;

        const { tag = this.defaultTag, context = {}, debugType = 'curator', debugData = {} } = options;
        
        // Call LoggerService
        LOG_METHODS.warn.logger(tag, message);
        
        // Call LogManager
        LOG_METHODS.warn.logManager(message, { ...context, logger: 'RendererLogger' });
        
        // Call DebugLogger if active
        if (DebugLogger.isActive()) {
            // Use the debugType to determine which debug logger method to call
            switch(debugType) {
                case 'worker':
                    DebugLogger.logWorker(debugData.id || 'unknown', { message, ...debugData });
                    break;
                case 'cache':
                    DebugLogger.logCacheHit(debugData.path || 'unknown', { message, ...debugData });
                    break;
                case 'curator':
                    DebugLogger.logCurator(debugData.phase || 'general', { message, ...debugData });
                    break;
                case 'chat':
                    DebugLogger.logChat(debugData.type || 'general', message);
                    break;
                case 'memory':
                    DebugLogger.logMemory(debugData.cache || {}, debugData.ctx || {});
                    break;
                case 'context':
                    DebugLogger.logContextEvolution({ message, ...debugData });
                    break;
                default:
                    DebugLogger.logCurator(debugType, { message, ...debugData });
            }
        }
    }

    /**
     * Unified error method that delegates to all loggers
     */
    error(message, options = {}) {
        if (!this.enabled) return;

        const { tag = this.defaultTag, context = {}, debugType = 'curator', debugData = {} } = options;
        
        // Call LoggerService
        LOG_METHODS.error.logger(tag, message);
        
        // Call LogManager
        LOG_METHODS.error.logManager(message, { ...context, logger: 'RendererLogger' });
        
        // Call DebugLogger if active
        if (DebugLogger.isActive()) {
            // Use the debugType to determine which debug logger method to call
            switch(debugType) {
                case 'worker':
                    DebugLogger.logWorker(debugData.id || 'unknown', { message, ...debugData });
                    break;
                case 'cache':
                    DebugLogger.logCacheHit(debugData.path || 'unknown', { message, ...debugData });
                    break;
                case 'curator':
                    DebugLogger.logCurator(debugData.phase || 'general', { message, ...debugData });
                    break;
                case 'chat':
                    DebugLogger.logChat(debugData.type || 'general', message);
                    break;
                case 'memory':
                    DebugLogger.logMemory(debugData.cache || {}, debugData.ctx || {});
                    break;
                case 'context':
                    DebugLogger.logContextEvolution({ message, ...debugData });
                    break;
                default:
                    DebugLogger.logCurator(debugType, { message, ...debugData });
            }
        }
    }

    /**
     * Convenience method for logging cache-related events
     */
    cache(message, isHit = false, options = {}) {
        if (!this.enabled) return;
        
        Logger.cache(message, isHit);
        logManager.info(message, { ...options.context, component: 'Cache', logger: 'RendererLogger' });
        
        if (DebugLogger.isActive()) {
            DebugLogger.logCacheHit(options.path || 'unknown', { message, isHit, ...options });
        }
    }

    /**
     * Convenience method for logging AI-related events
     */
    ai(tag, message, options = {}) {
        if (!this.enabled) return;
        
        Logger.ai(tag, message);
        logManager.info(`${tag}: ${message}`, { ...options.context, component: 'AI', logger: 'RendererLogger' });
        
        if (DebugLogger.isActive()) {
            DebugLogger.logCurator('ai', { tag, message, ...options });
        }
    }

    /**
     * Convenience method for logging worker-related events
     */
    worker(workerId, message, options = {}) {
        if (!this.enabled) return;
        
        Logger.worker(workerId, message);
        logManager.info(`Worker ${workerId}: ${message}`, { ...options.context, component: 'Worker', logger: 'RendererLogger' });
        
        if (DebugLogger.isActive()) {
            DebugLogger.logWorker(workerId, { message, ...options });
        }
    }

    /**
     * Get audit logs from LogManager
     */
    getAuditLogs() {
        return logManager.getAuditLogs();
    }
}

// Singleton export
export const RendererLogger = new RendererLoggerService();

// Export convenience functions for backward compatibility
export const rendererLogger = {
    debug: (msg, opts) => RendererLogger.debug(msg, opts),
    info: (msg, opts) => RendererLogger.info(msg, opts),
    warn: (msg, opts) => RendererLogger.warn(msg, opts),
    error: (msg, opts) => RendererLogger.error(msg, opts),
    cache: (msg, isHit, opts) => RendererLogger.cache(msg, isHit, opts),
    ai: (tag, msg, opts) => RendererLogger.ai(tag, msg, opts),
    worker: (id, msg, opts) => RendererLogger.worker(id, msg, opts)
};