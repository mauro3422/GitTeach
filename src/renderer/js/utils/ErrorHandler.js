/**
 * ErrorHandler.js
 * Centralized error handling and logging utilities.
 * Provides consistent error management across the application.
 */

export class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
    }

    /**
     * Handle and log an error
     * @param {Error|string} error - The error to handle
     * @param {string} context - Context where the error occurred
     * @param {Object} additionalData - Additional data to log
     */
    handleError(error, context = 'Unknown', additionalData = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            context,
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : error,
            additionalData
        };

        this.errorLog.unshift(errorEntry);

        // Maintain max log size
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.pop();
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error(`[ErrorHandler] ${context}:`, error, additionalData);
        }

        // Emit error event if event bus is available
        if (typeof window !== 'undefined' && window.pipelineEventBus) {
            window.pipelineEventBus.emit('error:occurred', errorEntry);
        }

        return errorEntry;
    }

    /**
     * Handle async operation errors
     * @param {Promise} promise - Promise to handle errors for
     * @param {string} context - Context for error logging
     * @returns {Promise} Promise that resolves to [error, result]
     */
    async safeAsync(promise, context = 'Async Operation') {
        try {
            const result = await promise;
            return [null, result];
        } catch (error) {
            this.handleError(error, context);
            return [error, null];
        }
    }

    /**
     * Wrap a function with error handling
     * @param {Function} fn - Function to wrap
     * @param {string} context - Context for error logging
     * @returns {Function} Wrapped function
     */
    wrapFunction(fn, context = 'Wrapped Function') {
        return (...args) => {
            try {
                const result = fn.apply(this, args);
                if (result && typeof result.catch === 'function') {
                    // Handle promises
                    return result.catch(error => {
                        this.handleError(error, context, { args });
                        throw error;
                    });
                }
                return result;
            } catch (error) {
                this.handleError(error, context, { args });
                throw error;
            }
        };
    }

    /**
     * Validate data structure
     * @param {any} data - Data to validate
     * @param {Object} schema - Validation schema
     * @param {string} context - Context for error logging
     * @returns {boolean} True if valid
     */
    validateData(data, schema, context = 'Data Validation') {
        try {
            // Simple validation - can be extended
            for (const [key, validator] of Object.entries(schema)) {
                if (typeof validator === 'function') {
                    if (!validator(data[key])) {
                        throw new Error(`Validation failed for ${key}`);
                    }
                } else if (validator.required && (data[key] === undefined || data[key] === null)) {
                    throw new Error(`Required field ${key} is missing`);
                }
            }
            return true;
        } catch (error) {
            this.handleError(error, context, { data, schema });
            return false;
        }
    }

    /**
     * Get recent errors
     * @param {number} count - Number of recent errors to get
     * @returns {Array} Recent error entries
     */
    getRecentErrors(count = 10) {
        return this.errorLog.slice(0, count);
    }

    /**
     * Clear error log
     */
    clearLog() {
        this.errorLog = [];
    }

    /**
     * Export error log
     * @returns {string} JSON string of error log
     */
    exportLog() {
        return JSON.stringify(this.errorLog, null, 2);
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getStats() {
        const stats = {
            total: this.errorLog.length,
            byContext: {},
            byType: {},
            recent: this.getRecentErrors(5)
        };

        this.errorLog.forEach(entry => {
            // Count by context
            stats.byContext[entry.context] = (stats.byContext[entry.context] || 0) + 1;

            // Count by error type
            const errorType = entry.error.name || 'Unknown';
            stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
        });

        return stats;
    }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Global error handlers for uncaught errors
if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        errorHandler.handleError(event.error || event.message, 'Global Error', {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        errorHandler.handleError(event.reason, 'Unhandled Promise Rejection');
    });
}
