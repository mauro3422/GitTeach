// src/main/services/system/AppLogger.js
import path from 'path';
import fs from 'fs';

/**
 * AppLogger - Unified logging system for GitTeach.
 * Centralizes console, file, and debug logging.
 */
class AppLogger {
    constructor() {
        this.logLevels = {
            INFO: 'INFO',
            WARN: 'WARN',
            ERROR: 'ERROR',
            DEBUG: 'DEBUG'
        };
    }

    /**
     * Standard info log
     */
    info(context, message, data = null) {
        this._log(this.logLevels.INFO, context, message, data);
    }

    /**
     * Warning log
     */
    warn(context, message, data = null) {
        this._log(this.logLevels.WARN, context, message, data);
    }

    /**
     * Error log with stack trace
     */
    error(context, message, error = null) {
        const errorData = error ? {
            message: error.message,
            stack: error.stack
        } : null;
        this._log(this.logLevels.ERROR, context, message, errorData);
    }

    /**
     * Debug log (only in dev or when enabled)
     */
    debug(context, message, data = null) {
        if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
            this._log(this.logLevels.DEBUG, context, message, data);
        }
    }

    /**
     * Internal logging logic
     */
    _log(level, context, message, data) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] [${context}] ${message}`;

        switch (level) {
            case this.logLevels.ERROR:
                console.error(formattedMessage, data || '');
                break;
            case this.logLevels.WARN:
                console.warn(formattedMessage, data || '');
                break;
            default:
                console.log(formattedMessage, data || '');
        }

        // Bridge to potential file logger or external monitoring here
    }
}

export default new AppLogger();
