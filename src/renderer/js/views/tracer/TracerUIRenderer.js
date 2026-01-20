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
        const btnStop = this.domCache.get('btnStop');
        if (!btn) return;

        // Ultra-minimalist geometric icons
        const playIcon = '<svg viewBox="0 0 24 24" width="18"><path fill="currentColor" d="M8,5v14l11-7L8,5z"/></svg>';
        const pauseIcon = '<svg viewBox="0 0 24 24" width="18"><path fill="currentColor" d="M6,19h4V5H6V19z M14,5v14h4V5H14z"/></svg>';
        // For verify, we'll use a simple "target" or "dotted play" - let's use a simple triangle outline
        const verifyIcon = '<svg viewBox="0 0 24 24" width="18"><path fill="none" stroke="currentColor" stroke-width="2" d="M8,5v14l11-7L8,5z"/></svg>';

        switch (state) {
            case 'IDLE':
                btn.innerHTML = verifyIcon;
                btn.className = 'control-btn control-btn--verify';
                btn.disabled = false;
                if (btnStop) btnStop.disabled = true;
                break;
            case 'VERIFYING':
                btn.innerHTML = '<span class="pulse-dot"></span>';
                btn.disabled = true;
                break;
            case 'READY':
                btn.innerHTML = playIcon;
                btn.className = 'control-btn control-btn--primary';
                btn.disabled = false;
                if (btnStop) btnStop.disabled = true;
                break;
            case 'RUNNING':
                btn.innerHTML = pauseIcon;
                btn.className = 'control-btn control-btn--pause';
                btn.disabled = false;
                if (btnStop) btnStop.disabled = false;
                break;
            case 'PAUSED':
                btn.innerHTML = playIcon;
                btn.className = 'control-btn control-btn--primary';
                btn.disabled = false;
                if (btnStop) btnStop.disabled = false;
                break;
            case 'STOPPING':
                btn.innerHTML = '<span class="pulse-dot"></span>';
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
        const percent = total > 0 ? Math.round((analyzed / total) * 100) : 0;

        const progressFill = this.domCache.get('progressFill');
        const progressText = this.domCache.get('progressText');

        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;
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
