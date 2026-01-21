/**
 * PipelineCanvasUI.js
 * Responsabilidad: Gestión del DOM dinámico y Header.
 */

import { pipelineController } from '../services/pipeline/PipelineController.js';

export const PipelineCanvasUI = {
    container: null,
    canvas: null,
    header: null,

    /**
     * Inicializa la UI con el contenedor
     */
    init(container) {
        this.container = container;
        this.createCanvas();
        this.bindEvents();
    },

    /**
     * Crea el canvas y header (DOM dinámico)
     */
    createCanvas() {
        if (!this.container) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-inner-container';

        // Crear Header
        this.header = document.createElement('div');
        this.header.className = 'canvas-header';
        this.header.innerHTML = `
            <div class="header-section header-config">
                <div class="config-item">
                    <span class="config-label">REPOS</span>
                    <input type="number" id="cfg-max-repos" class="config-input" value="10" min="1" max="50">
                </div>
                <div class="config-item">
                    <span class="config-label">FILES</span>
                    <input type="number" id="cfg-max-files" class="config-input" value="10" min="1" max="100">
                </div>
            </div>

            <div class="header-section header-controls">
                <button id="canvas-play" class="control-btn control-btn--primary" title="Start / Pause">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
                </button>
                <button id="canvas-stop" class="control-btn" title="Stop Analysis">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18,18H6V6H18V18Z" /></svg>
                </button>
            </div>

            <div class="header-section header-fleet">
                <div class="fleet-item fleet-item--compact" id="canvas-fleet-8000">
                    <span class="fleet-name">BRAIN (GPU:8000)</span>
                    <div class="slots-grid"></div>
                    <span class="fleet-status">--</span>
                </div>
                <div class="fleet-item fleet-item--compact" id="canvas-fleet-8002">
                    <span class="fleet-name">MAPPERS (CPU:8002)</span>
                    <div class="slots-grid"></div>
                    <span class="fleet-status">--</span>
                </div>
                <div class="fleet-item fleet-item--compact" id="canvas-fleet-8001">
                    <span class="fleet-name">VECTORS (EMB:8001)</span>
                    <div class="slots-grid"></div>
                    <span class="fleet-status">--</span>
                </div>
            </div>

            <div class="header-section header-progress">
                <div class="progress-bar-mini">
                    <div id="canvas-progress-fill" class="progress-fill-mini"></div>
                </div>
                <span id="canvas-progress-text" class="progress-text-mini">0%</span>
            </div>
        `;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        wrapper.appendChild(this.header);
        wrapper.appendChild(this.canvas);
        this.container.appendChild(wrapper);
    },

    /**
     * Vincula eventos de la UI
     */
    bindEvents() {
        const playBtn = document.getElementById('canvas-play');
        const stopBtn = document.getElementById('canvas-stop');

        if (playBtn) {
            playBtn.onclick = () => pipelineController.play();
        }

        if (stopBtn) {
            stopBtn.onclick = () => pipelineController.stop();
        }
    },

    /**
     * Actualiza el progreso en la barra
     */
    updateProgress(value) {
        const fillEl = document.getElementById('canvas-progress-fill');
        const textEl = document.getElementById('canvas-progress-text');

        if (fillEl) {
            fillEl.style.width = `${value}%`;
        }

        if (textEl) {
            textEl.textContent = `${Math.round(value)}%`;
        }
    },

    /**
     * Actualiza el estado de la flota en la UI
     */
    updateFleetStatus(payload) {
        // Actualizar elementos de flota según payload
        Object.entries(payload).forEach(([port, status]) => {
            const fleetEl = document.getElementById(`canvas-fleet-${port}`);
            if (fleetEl) {
                const statusEl = fleetEl.querySelector('.fleet-status');
                if (statusEl) {
                    statusEl.textContent = status.online ? 'ONLINE' : 'OFFLINE';
                    statusEl.className = `fleet-status ${status.online ? 'fleet-status--online' : 'fleet-status--offline'}`;
                }
            }
        });
    },

    /**
     * Obtiene el canvas element
     */
    getCanvas() {
        return this.canvas;
    },

    /**
     * Obtiene el contexto del canvas
     */
    getContext() {
        return this.ctx;
    },

    /**
     * Actualiza dimensiones del canvas
     */
    resize(width, height) {
        if (this.canvas) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }
};
