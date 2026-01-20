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
        const btnToggleDebugger = domCache.get('btnToggleDebugger');

        if (btnRun) {
            btnRun.addEventListener('click', () => this.handleActionClick());
        }

        // Toggle debugger visibility
        if (btnToggleDebugger) {
            btnToggleDebugger.addEventListener('click', () => this.handleToggleDebugger());
        }
    },

    /**
     * Handle main action button clicks
     */
    handleActionClick() {
        if (this.controller) {
            this.controller.handleAction();
        }
    },

    /**
     * Handle debugger toggle
     */
    handleToggleDebugger() {
        RendererLogger.info('[TracerEventHandler] Toggling Debugger...', {
            context: { component: 'TracerEventHandler' }
        });

        const debuggerEls = this.controller.domCache.getDebugger();
        const section = debuggerEls.section;
        const btn = debuggerEls.button;

        if (!section) {
            RendererLogger.error('[TracerEventHandler] FATAL: debuggerSection not found', {
                context: { component: 'TracerEventHandler' }
            });
            return;
        }

        const isCurrentlyHidden = section.classList.contains('hidden') || section.style.display === 'none';

        RendererLogger.info('[TracerEventHandler] Debugger current state:', {
            context: {
                component: 'TracerEventHandler',
                isCurrentlyHidden,
                classList: section.className,
                display: section.style.display
            }
        });

        if (isCurrentlyHidden) {
            this.showDebugger();
        } else {
            this.hideDebugger();
        }
    },

    /**
     * Show debugger section
     */
    showDebugger() {
        const debuggerEls = this.controller.domCache.getDebugger();
        const section = debuggerEls.section;
        const btn = debuggerEls.button;

        section.classList.remove('hidden');
        section.style.display = 'flex';
        if (btn) btn.classList.add('active');

        RendererLogger.info('[TracerEventHandler] Debugger FORCED TO VISIBLE', {
            context: { component: 'TracerEventHandler' }
        });

        // Critical for Canvas geometry
        setTimeout(() => {
            RendererLogger.info('[TracerEventHandler] Recalculating Canvas Geometry...', {
                context: { component: 'TracerEventHandler' }
            });
            PipelineCanvas.resizeCanvas();
        }, 50);
    },

    /**
     * Hide debugger section
     */
    hideDebugger() {
        const debuggerEls = this.controller.domCache.getDebugger();
        const section = debuggerEls.section;
        const btn = debuggerEls.button;

        section.classList.add('hidden');
        section.style.display = 'none';
        if (btn) btn.classList.remove('active');

        RendererLogger.info('[TracerEventHandler] Debugger FORCED TO HIDDEN', {
            context: { component: 'TracerEventHandler' }
        });
    }
};
