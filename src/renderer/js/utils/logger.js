/**
 * Logger - Servicio centralizado de logging
 * Abstrae las llamadas a window.githubAPI.logToTerminal
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Icons por categoría
const ICONS = {
    SCAN: '🔍',
    DOWNLOAD: '📥',
    CACHE: '⚡',
    AI: '🤖',
    WORKER: '🔧',
    BACKGROUND: '🔄',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    FORK: '🕵️',
    DNA: '🧬',
    MEMORY: '🧠',
    PROGRESS: '📊',
    MAPPER: '🏗️',
    REDUCER: '🧪',
    METABOLIC: '💾'
};

class LoggerService {
    constructor() {
        this.minLevel = LOG_LEVELS.DEBUG;
        this.enabled = true;
    }

    /**
     * Habilitar/deshabilitar logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Establecer nivel mínimo de log
     */
    setMinLevel(level) {
        this.minLevel = LOG_LEVELS[level] || LOG_LEVELS.DEBUG;
    }

    /**
     * Log interno - envía al terminal si está disponible
     */
    _log(level, tag, message, icon = null) {
        if (!this.enabled || level < this.minLevel) return;

        const iconStr = icon || ICONS[tag] || '📝';
        const formattedMessage = `${iconStr} [${tag}] ${message}`;

        // Enviar a terminal de Electron si está disponible
        if (window.githubAPI?.logToTerminal) {
            window.githubAPI.logToTerminal(formattedMessage);
        }

        // También loguear a consola para desarrollo
        if (level === LOG_LEVELS.ERROR) {
            console.error(formattedMessage);
        } else if (level === LOG_LEVELS.WARN) {
            console.warn(formattedMessage);
        } else {
            console.log(formattedMessage);
        }
    }

    // --- Métodos de conveniencia ---

    debug(tag, message) {
        this._log(LOG_LEVELS.DEBUG, tag, message);
    }

    info(tag, message) {
        this._log(LOG_LEVELS.INFO, tag, message);
    }

    warn(tag, message) {
        this._log(LOG_LEVELS.WARN, tag, message, ICONS.WARNING);
    }

    error(tag, message) {
        this._log(LOG_LEVELS.ERROR, tag, message, ICONS.ERROR);
    }

    success(tag, message) {
        this._log(LOG_LEVELS.INFO, tag, message, ICONS.SUCCESS);
    }

    // --- Métodos específicos por contexto ---

    scan(message) {
        this.info('SCAN', message);
    }

    cache(message, isHit = false) {
        const icon = isHit ? ICONS.CACHE : '💾';
        this._log(LOG_LEVELS.INFO, 'CACHE', message, icon);
    }

    ai(tag, message) {
        this._log(LOG_LEVELS.INFO, tag, message, ICONS.AI);
    }

    worker(workerId, message) {
        this._log(LOG_LEVELS.INFO, `Worker ${workerId}`, message, ICONS.WORKER);
    }

    background(message) {
        this._log(LOG_LEVELS.INFO, 'BACKGROUND', message, ICONS.BACKGROUND);
    }

    progress(current, total, message = '') {
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        this._log(LOG_LEVELS.INFO, 'PROGRESS', `${current}/${total} (${percent}%) ${message}`, ICONS.PROGRESS);
    }

    fork(message, verified = false) {
        const icon = verified ? ICONS.SUCCESS : ICONS.FORK;
        this._log(LOG_LEVELS.INFO, verified ? 'FORK VERIFIED' : 'FORK CSI', message, icon);
    }

    dna(message) {
        this._log(LOG_LEVELS.INFO, 'DNA', message, ICONS.DNA);
    }

    mapper(message) {
        this._log(LOG_LEVELS.INFO, 'THEMATIC MAPPER', message, ICONS.MAPPER);
    }

    reducer(message) {
        this._log(LOG_LEVELS.INFO, 'REDUCER', message, ICONS.REDUCER);
    }

    metabolic(message) {
        this._log(LOG_LEVELS.INFO, 'METABOLIC', message, ICONS.METABOLIC);
    }
}

// Singleton export
export const Logger = new LoggerService();
