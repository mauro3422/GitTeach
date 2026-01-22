/**
 * TracerController.js
 * Orquestador principal que coordina todos los módulos
 */

import { TracerStateManager } from './TracerStateManager.js';
import { TracerDOMCache } from './TracerDOMCache.js';
import { TracerEventHandler } from './TracerEventHandler.js';
import { TracerUIRenderer } from './TracerUIRenderer.js';
import { TracerFleetRenderer } from './TracerFleetRenderer.js';
import { TracerAnalysisManager } from './TracerAnalysisManager.js';

import { fleetMonitor } from '../../services/ai/FleetMonitor.js';
import { PipelineCanvas } from '../PipelineCanvas.js';
import { PipelineSimulation } from '../pipeline/PipelineSimulation.js';
import { logManager } from '../../utils/logManager.js';
import { RendererLogger } from '../../utils/RendererLogger.js';

export const TracerController = {
    domCache: TracerDOMCache,
    stateManager: TracerStateManager,
    simulation: null,

    /**
     * Initialize the entire Tracer system
     */
    async init() {
        try {
            RendererLogger.info('[TracerController] Initializing Tracer system...', {
                context: { component: 'TracerController' }
            });

            // 1. Initial Cache of static elements
            TracerDOMCache.cache();

            // 2. Initialize Pipeline Canvas FIRST (creates dynamic header)
            const debuggerContainer = TracerDOMCache.getDebugger().container;
            if (debuggerContainer) {
                RendererLogger.info('[TracerController] Initializing PipelineCanvas (Master UI)...', {
                    context: { component: 'TracerController' }
                });
                PipelineCanvas.init(debuggerContainer);

                // Final resize check
                setTimeout(() => PipelineCanvas.resizeCanvas(), 100);
            }

            // 3. RE-CACHE to pick up elements inside the Canvas Header
            TracerDOMCache.refresh();

            // 4. Initialize specialized services
            await fleetMonitor.init();
            TracerStateManager.reset();

            // 5. Initialize UI renderers (now they find the elements in the header)
            TracerUIRenderer.init(TracerDOMCache);
            TracerFleetRenderer.init(TracerDOMCache);

            // 6. Initialize PipelineSimulation controller
            this.simulation = new PipelineSimulation();
            this.simulation.init();
            window.pipelineSimulation = this.simulation; // Make available globally

            // 7. Initialize event handler & analysis manager
            TracerEventHandler.init(this);
            TracerAnalysisManager.init();

            // 8. Set up external integrations
            this.setupIntegrations();

            // 8. Initial checks
            await this.checkAIStatus();
            this.loadRecentSession();

            // Sync current fleet state
            const currentState = fleetMonitor.getState();
            if (currentState) {
                TracerFleetRenderer.render(currentState);
            }
            setTimeout(() => fleetMonitor.refresh(), 500);

            // Initial fleet verification
            setTimeout(() => this.verifyFleet(), 500);

            RendererLogger.info('[TracerController] Tracer system initialized successfully', {
                context: { component: 'TracerController' }
            });

        } catch (error) {
            RendererLogger.error('[TracerController] FATAL_INIT_ERROR:', error);
            console.error('[TracerController] Fatal initialization failure:', error);
        }
    },

    /**
     * Set up external service integrations
     */
    setupIntegrations() {
        // Fleet monitor subscription
        fleetMonitor.subscribe((state) => {
            TracerFleetRenderer.render(state);
        });

        // Log manager transport
        logManager.addTransport({
            log: (level, msg, ctx) => {
                TracerUIRenderer.renderLog(level, msg, ctx);
            }
        });
    },

    /**
     * Handle main action button based on current state
     */
    async handleAction() {
        const state = TracerStateManager.getState();

        if (state === 'IDLE') {
            await this.verifyFleet();
        } else if (state === 'READY') {
            await this.startAnalysis();
        } else if (state === 'RUNNING' || state === 'PAUSED') {
            // Toggles between play/pause of the visualizer behavior
            this.togglePlayback();
        }
    },

    /**
     * Toggle visualizer playback
     */
    togglePlayback() {
        if (pipelineController.isPaused()) {
            pipelineController.play();
            TracerStateManager.transitionTo('RUNNING');
            TracerUIRenderer.updateButton('RUNNING');
        } else {
            pipelineController.pause();
            TracerStateManager.transitionTo('PAUSED');
            TracerUIRenderer.updateButton('PAUSED');
        }
    },

    /**
     * Handle manual step
     */
    handleStep() {
        pipelineController.step();
    },

    /**
     * Verify fleet health
     */
    async verifyFleet() {
        TracerStateManager.transitionTo('VERIFYING');
        TracerUIRenderer.updateButton('VERIFYING');

        TracerUIRenderer.renderLog('INFO', 'INITIATING_PRE-FLIGHT_HEALTH_CHECK...');

        const success = await TracerAnalysisManager.verifyFleet();
        if (success) {
            TracerUIRenderer.renderLog('INFO', 'AI_FLEET_STATUS: VERIFIED');
            TracerUIRenderer.flashReady();

            await new Promise(r => setTimeout(r, 600));

            TracerStateManager.transitionTo('READY');
            TracerUIRenderer.updateButton('READY');
        } else {
            TracerStateManager.reset();
            TracerUIRenderer.updateButton('IDLE');
        }
    },

    /**
     * Start analysis with current config
     */
    async startAnalysis() {
        if (!TracerStateManager.isReadyForAnalysis()) return;

        TracerStateManager.transitionTo('RUNNING');
        TracerUIRenderer.updateButton('RUNNING');

        try {
            const config = this.getConfig();
            const stats = await TracerAnalysisManager.startAnalysis(config);

            TracerUIRenderer.updateProgress(stats);
            TracerStateManager.reset();
            TracerUIRenderer.updateButton('IDLE');

            TracerUIRenderer.renderLog('INFO', `Analysis complete! Summary generated in logs/tracer_logs/SUMMARY.json`);

        } catch (error) {
            TracerUIRenderer.renderLog('ERROR', `Pipeline failure: ${error.message}`);
            RendererLogger.error('[TracerController] Analysis failed:', {
                context: { component: 'TracerController', error: error.message }
            });
            TracerStateManager.reset();
            TracerUIRenderer.updateButton('IDLE');
        }
    },

    /**
     * Stop current analysis
     */
    async stopAnalysis() {
        if (!TracerStateManager.isRunning()) return;

        TracerStateManager.transitionTo('STOPPING');
        TracerUIRenderer.updateButton('STOPPING');

        try {
            await TracerAnalysisManager.stopAnalysis();
            TracerUIRenderer.renderLog('INFO', 'Analysis aborted by user.');
        } finally {
            TracerStateManager.reset();
            TracerUIRenderer.updateButton('IDLE');
        }
    },

    /**
     * Get analysis configuration from UI
     */
    getConfig() {
        const maxRepos = parseInt(document.getElementById('cfg-max-repos').value) || 10;
        const maxAnchors = parseInt(document.getElementById('cfg-max-files').value) || 10;
        return { maxRepos, maxAnchors };
    },

    /**
     * Check AI service status
     */
    async checkAIStatus() {
        await TracerAnalysisManager.checkAIStatus();
    },

    /**
     * Load recent session info
     */
    loadRecentSession() {
        const id = `TRACE_${new Date().getTime()}`;
        const sessionEl = TracerDOMCache.get('sessionId');
        if (sessionEl) {
            sessionEl.textContent = `SESSION: ${id}`;
        }
        window.CURRENT_SESSION_ID = id;

        RendererLogger.info(`[TracerController] Session ID: ${id}`, {
            context: { component: 'TracerController', sessionId: id }
        });
    },

    /**
     * Mount debugger panel - called when panel is opened
     */
    mountDebuggerPanel() {
        if (this.simulation) {
            this.simulation.mount();
        }
    },

    /**
     * Unmount debugger panel - called when panel is closed or view is destroyed
     */
    unmountDebuggerPanel() {
        if (this.simulation) {
            this.simulation.unmount();
        }
    }
};

// Make UI renderer and simulation available globally for callbacks
window.tracerUIRenderer = TracerUIRenderer;
window.pipelineSimulation = null; // Will be set after init
