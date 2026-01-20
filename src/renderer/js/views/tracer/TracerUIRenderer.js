/**
 * TracerUIRenderer.js
 * Responsabilidad única: Actualizar la UI (progress, logs, button)
 */

import { RendererLogger } from '../../utils/RendererLogger.js';

export const TracerUIRenderer = {
    domCache: null,

    /**
     * Initialize with DOM cache reference
     */
    init(domCache) {
        this.domCache = domCache;
    },

    /**
     * Update button text and style based on state
     */
    updateButton(state) {
        const btn = this.domCache.get('btnRun');
        if (!btn) return;

        switch (state) {
            case 'IDLE':
                btn.textContent = '🔍 VERIFY_AI_FLEET';
                btn.style.background = 'linear-gradient(90deg, #21262d, #30363d)';
                btn.disabled = false;
                break;
            case 'VERIFYING':
                btn.textContent = '⌛ VERIFYING_FLEET...';
                btn.disabled = true;
                break;
            case 'READY':
                btn.textContent = '🚀 START_FLIGHT_RECODER';
                btn.style.background = 'linear-gradient(90deg, #238636, #2ea043)';
                btn.disabled = false;
                break;
            case 'RUNNING':
                btn.textContent = '🛑 STOP_ANALYSIS';
                btn.style.background = 'linear-gradient(90deg, #da3633, #f85149)';
                btn.disabled = false;
                break;
            case 'STOPPING':
                btn.textContent = '⌛ STOPPING...';
                btn.disabled = true;
                break;
        }
    },

    /**
     * Update progress bar and text
     */
    updateProgress(stats) {
        const analyzed = stats.analyzed || 0;
        const total = stats.totalFiles || 0;

        // Calculate real percentage from stats
        const percent = total > 0 ? Math.round((analyzed / total) * 100) : 0;

        const progressFill = this.domCache.get('progressFill');
        const progressText = this.domCache.get('progressText');
        const queueText = this.domCache.get('queueText');

        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        if (progressText) {
            progressText.textContent = `${percent}%`;
        }
        if (queueText) {
            queueText.textContent = `${analyzed}/${total}`;
        }
    },

    /**
     * Render a log entry
     */
    renderLog(level, msg, ctx = {}) {
        const logStream = this.domCache.get('logStream');
        if (!logStream) return;

        const div = document.createElement('div');

        // Map numeric level to name if needed
        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const levelStr = (typeof level === 'number') ? levelNames[level] : level;

        div.className = `log-entry ${(levelStr || 'info').toLowerCase()}`;
        const time = this.formatTime();
        div.textContent = `[${time}] [${ctx.component || 'SYSTEM'}] ${msg}`;

        logStream.appendChild(div);

        // Auto-scroll logic
        logStream.scrollTop = logStream.scrollHeight;

        // Keep logs manageable
        this.truncateLogs();
    },

    /**
     * Brief visual flash to show verification success
     */
    flashReady() {
        const dots = document.querySelectorAll('.slot-dot');
        dots.forEach(dot => {
            if (!dot.classList.contains('error')) {
                dot.classList.add('ready');
                setTimeout(() => dot.classList.remove('ready'), 600);
            }
        });
    },

    /**
     * Format current time for logs
     */
    formatTime() {
        return new Date().toLocaleTimeString();
    },

    /**
     * Keep logs manageable by removing old entries
     */
    truncateLogs() {
        const logStream = this.domCache.get('logStream');
        if (!logStream) return;

        if (logStream.children.length > 300) {
            logStream.removeChild(logStream.firstChild);
        }
    }
};
