/**
 * LoggerCapture - Terminal and stream capture for forensic analysis
 * 
 * Responsabilidad: Interceptar console.log/error/warn y eventos de Node
 * para generar el terminalHistory del reporte final.
 */

export class LoggerCapture {
    constructor() {
        this.terminalHistory = [];
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };
    }

    start() {
        console.log = (...args) => {
            this.captureLog('log', ...args);
            this.originalConsole.log.apply(console, args);
        };
        console.error = (...args) => {
            this.captureLog('error', ...args);
            this.originalConsole.error.apply(console, args);
        };
        console.warn = (...args) => {
            this.captureLog('warn', ...args);
            this.originalConsole.warn.apply(console, args);
        };

        // Node specific events
        process.on('warning', (warning) => {
            this.captureLog('node_warning', warning.name, warning.message);
        });
        process.on('uncaughtException', (err) => {
            this.captureLog('uncaught_exception', err.message, err.stack);
        });
    }

    captureLog(type, ...args) {
        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        this.terminalHistory.push({
            timestamp: new Date().toISOString(),
            type: type,
            message: message.substring(0, 500)
        });
        if (this.terminalHistory.length > 500) {
            this.terminalHistory.shift();
        }
    }

    getHistory(limit = 300) {
        return this.terminalHistory.slice(-limit);
    }

    getErrors() {
        return this.terminalHistory.filter(h =>
            h.type === 'error' ||
            h.type === 'node_warning' ||
            h.type === 'uncaught_exception'
        );
    }
}

export const loggerCapture = new LoggerCapture();
