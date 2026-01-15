/**
 * Logger - Centralized logging service
 * Abstracts calls to window.githubAPI.logToTerminal
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Icons by category
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
    REDUCER: '🧪',
    IDENTITY: '🧬',
    PROFILE: '🧠'
};

class LoggerService {
    constructor() {
        this.minLevel = LOG_LEVELS.DEBUG;
        this.enabled = true;
    }

    /**
     * Enable/disable logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Set minimum log level
     */
    setMinLevel(level) {
        this.minLevel = LOG_LEVELS[level] || LOG_LEVELS.DEBUG;
    }

    /**
     * Internal log - sends to terminal if available
     */
    _log(level, tag, message, icon = null) {
        if (!this.enabled || level < this.minLevel) return;

        // --- CORTAFUEGOS DE SILENCIO (v15.0) ---
        // Si la IA está offline, silenciamos ruidos de análisis, pero dejamos pasar errores y estados de IA
        const isNoise = [
            'SCAN', 'DOWNLOAD', 'CACHE', 'PROGRESS', 'FORK', 'BACKGROUND',
            'THEMATIC MAPPER', 'REDUCER', 'SYNTHESIZER', 'ANALYZER', 'WARNING',
            'AIService', 'Coordinator'
        ].includes(tag);

        if (typeof window !== 'undefined' && window.AI_OFFLINE && isNoise && level < LOG_LEVELS.ERROR) {
            return;
        }

        const iconStr = icon || ICONS[tag] || '📝';
        const formattedMessage = `${iconStr} [${tag}] ${message}`;

        // Enviar a terminal de Electron si está disponible
        if (typeof window !== 'undefined' && window.githubAPI?.logToTerminal) {
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

    // --- Convenience methods ---

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

    // --- Context-specific methods ---

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

    identity(message) {
        this._log(LOG_LEVELS.INFO, 'IDENTITY', message, ICONS.IDENTITY);
    }

    mapper(message) {
        this._log(LOG_LEVELS.INFO, 'THEMATIC MAPPER', message, ICONS.MAPPER);
    }

    reducer(message) {
        this._log(LOG_LEVELS.INFO, 'REDUCER', message, ICONS.REDUCER);
    }

    profile(message) {
        this._log(LOG_LEVELS.INFO, 'PROFILE', message, ICONS.PROFILE);
    }
}

// Singleton export
export const Logger = new LoggerService();
