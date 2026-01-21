/**
 * PipelineCanvas.js
 * Canvas-based visualization of the AI pipeline flow.
 * Orchestrates rendering, interaction, and data updates.
 */

import { PipelineUI } from './pipeline/PipelineUI.js';
import { RendererLogger } from '../utils/RendererLogger.js';
import { PipelineStateManager } from './pipeline/PipelineStateManager.js';
import { PipelineSimulation } from './pipeline/PipelineSimulation.js';
import { initializeContainers } from '../utils/initializeContainers.js';

// Nuevos módulos SOLID
import { PipelineCanvasUI } from './PipelineCanvasUI.js';
import { PipelineCanvasRenderer } from './PipelineCanvasRenderer.js';
import { PipelineCanvasEventManager } from './PipelineCanvasEventManager.js';
import { PipelineInteraction } from './pipeline/PipelineInteraction.js';

export const PipelineCanvas = {
    canvas: null,
    ctx: null,
    container: null,
    animationId: null,
    width: 0,
    height: 450,
    hoveredNode: null,
    selectedNode: null,

    /**
     * Initialize the visualizer
     * @param {HTMLElement} container
     */
    init(container) {
        if (!container) return;
        this.container = container;

        try {
            // Inicializar módulos SOLID
            PipelineCanvasUI.init(container);
            this.canvas = PipelineCanvasUI.getCanvas();
            this.ctx = PipelineCanvasUI.getContext();

            PipelineStateManager.init();
            initializeContainers();

            // Configurar renderizado
            PipelineCanvasRenderer.init(this.ctx, this.container.clientWidth || 800, this.height);
            PipelineCanvasRenderer.start();

            // Configurar eventos
            PipelineCanvasEventManager.init(this);

            // Configurar interacción
            this.bindInteractionEvents();

            // Configurar resize
            this.setupResizeHandler();

            // Exposure for debugging
            window.PIPELINE_DEBUG = {
                audit: () => this.auditState(),
                resize: () => this.resizeCanvas(),
                simulateSlot: (slotNum = 1) => PipelineSimulation.simulateTaskInSlot(slotNum, (e) => PipelineCanvasEventManager.handlePipelineEvent(e)),
                simulateFault: (port = 8000, online = false) => {
                    PipelineCanvasEventManager.handleFleetStatus({ [port]: { online } });
                },
                testContainerBox: () => {
                    console.log('Testing ContainerBoxManager...');
                    try {
                        const ContainerBoxManager = require('../utils/ContainerBoxManager.js').default;
                        console.log('ContainerBoxManager loaded:', !!ContainerBoxManager);
                        console.log('Registry size:', ContainerBoxManager.registry.size);
                        console.log('User boxes:', ContainerBoxManager.getUserBoxes());
                        return 'ContainerBoxManager working!';
                    } catch (error) {
                        console.error('ContainerBoxManager test failed:', error);
                        return 'Error: ' + error.message;
                    }
                }
            };

            RendererLogger.info('[PipelineCanvas] Orchestrator initialized (SOLID)', { context: { component: 'PipelineCanvas' } });
        } catch (err) {
            RendererLogger.error('[PipelineCanvas] Init failed:', { context: { component: 'PipelineCanvas', error: err.message }, debugData: { stack: err.stack } });
        }
    },

    /**
     * Configura eventos de interacción
     */
    bindInteractionEvents() {
        PipelineInteraction.bindEvents(this.canvas, {
            onMouseMove: () => {
                this.hoveredNode = PipelineInteraction.checkHover(this.width, this.height);
            },
            onMouseLeave: () => {
                this.hoveredNode = null;
            },
            onClick: () => {
                if (this.hoveredNode) {
                    this.selectNode(this.hoveredNode);
                } else {
                    this.closeDrawer();
                }
            }
        });
    },

    /**
     * Configura handler de resize
     */
    setupResizeHandler() {
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
    },

    auditState() {
        const nodeCount = Object.keys(PipelineStateManager.nodeStates).length;
        const particleCount = PipelineStateManager.particles.length;

        RendererLogger.info('PipelineCanvas SOLID Audit', {
            context: {
                component: 'PipelineCanvas',
                nodes: nodeCount,
                particles: particleCount
            }
        });
    },

    resizeCanvas() {
        if (!this.container) return;
        this.width = this.container.clientWidth || 800;
        PipelineCanvasUI.resize(this.width, this.height);
        PipelineCanvasRenderer.resize(this.width, this.height);
    },

    refreshDrawer() {
        if (!this.selectedNode) return;
        PipelineUI.updateDrawer(
            this.selectedNode,
            PipelineStateManager.nodeStats,
            PipelineStateManager.nodeHistory,
            PipelineStateManager.nodeStates,
            () => { this.selectedNode = null; }
        );
    },

    selectNode(nodeId) {
        this.selectedNode = nodeId;
        PipelineInteraction.state.autoFollow = true; // Re-engage camera to focus on selection
        PipelineUI.showDrawer(
            this.container,
            nodeId,
            PipelineStateManager.nodeStats,
            PipelineStateManager.nodeHistory,
            PipelineStateManager.nodeStates,
            () => { this.selectedNode = null; }
        );
    },

    closeDrawer() {
        PipelineUI.closeDrawer();
        this.selectedNode = null;
    },

    destroy() {
        PipelineCanvasRenderer.stop();
        window.PIPELINE_DEBUG = null;
    }
};

export default PipelineCanvas;
