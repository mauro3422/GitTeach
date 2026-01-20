/**
 * TracerEventHandler.js
 * Responsabilidad única: Manejar eventos de UI
 */

import { RendererLogger } from '../../utils/RendererLogger.js';
import { PipelineCanvas } from '../PipelineCanvas.js';

export const TracerEventHandler = {
    controller: null,

    /**
     * Initialize with controller reference
     */
    init(controller) {
        this.controller = controller;
        this.bindEvents();
    },

    /**
     * Bind all event listeners
     */
    bindEvents() {
        const domCache = this.controller.domCache;
        const btnRun = domCache.get('btnRun');
        const btnStop = domCache.get('btnStop');
        const btnStep = domCache.get('btnStep');

        if (btnRun) {
            btnRun.addEventListener('click', () => this.handleActionClick());
        }
        if (btnStop) {
            btnStop.addEventListener('click', () => this.handleStopClick());
        }
    },

    /**
     * Handle main action button clicks (Verify / Start / Play-Pause toggle)
     */
    handleActionClick() {
        if (this.controller) {
            this.controller.handleAction();
        }
    },

    /**
     * Handle stop button
     */
    handleStopClick() {
        if (this.controller) {
            this.controller.stopAnalysis();
        }
    },

    /**
     * Handle step button
     */
    handleStepClick() {
        if (this.controller && this.controller.handleStep) {
            this.controller.handleStep();
        }
    }
};
