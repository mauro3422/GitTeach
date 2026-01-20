/**
 * PipelineCanvas.js
 * Canvas-based visualization of the AI pipeline flow.
 * Orchestrates rendering, interaction, and data updates.
 */

import { pipelineController } from '../services/pipeline/PipelineController.js';
import { eventQueueBuffer } from '../services/pipeline/EventQueueBuffer.js';
import { PIPELINE_NODES, CONNECTIONS } from './pipeline/PipelineConstants.js';
import { PipelineRenderer } from './pipeline/PipelineRenderer.js';
import { PipelineInteraction } from './pipeline/PipelineInteraction.js';
import { PipelineUI } from './pipeline/PipelineUI.js';
import { RendererLogger } from '../utils/RendererLogger.js';

// New SOLID Modules
import { PipelineStateManager } from './pipeline/PipelineStateManager.js';
import { PipelineEventHandler } from './pipeline/PipelineEventHandler.js';
import { PipelineSimulation } from './pipeline/PipelineSimulation.js';

export const PipelineCanvas = {
    canvas: null,
    ctx: null,
    container: null,
    animationId: null,
    width: 0,
    height: 600,
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
            this.createCanvas();
            PipelineStateManager.init();
            this.bindEvents();
            this.subscribeToUpdates();
            this.startRenderLoop();

            // Exposure for debugging
            window.PIPELINE_DEBUG = {
                audit: () => this.auditState(),
                resize: () => this.resizeCanvas(),
                simulateSlot: (slotNum = 1) => PipelineSimulation.simulateTaskInSlot(slotNum, (e) => this.handlePipelineEvent(e)),
                simulateFault: (port = 8000, online = false) => {
                    this.handleFleetStatus({ [port]: { online } });
                }
            };

            RendererLogger.info('[PipelineCanvas] Orchestrator initialized (SOLID)', { context: { component: 'PipelineCanvas' } });
        } catch (err) {
            RendererLogger.error('[PipelineCanvas] Init failed:', { context: { component: 'PipelineCanvas', error: err.message }, debugData: { stack: err.stack } });
        }
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

    createCanvas() {
        if (!this.container) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-inner-container';

        const header = document.createElement('div');
        header.className = 'canvas-header';
        header.innerHTML = `
            <div class="header-left">
                <span class="header-icon">🧪</span>
                <span class="header-title">PIPELINE_FLOW_AUDIT</span>
            </div>
            <div class="header-controls">
                <button id="canvas-play" title="Resume Pipeline">▶</button>
                <button id="canvas-pause" title="Pause Pipeline">⏸</button>
                <button id="canvas-step" title="Step Forward">⏭</button>
            </div>
        `;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        wrapper.appendChild(header);
        wrapper.appendChild(this.canvas);
        this.container.appendChild(wrapper);

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    },

    resizeCanvas() {
        if (!this.container || !this.canvas) return;
        this.width = this.container.clientWidth || 800;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    bindEvents() {
        document.getElementById('canvas-play')?.addEventListener('click', () => pipelineController.play());
        document.getElementById('canvas-pause')?.addEventListener('click', () => pipelineController.pause());
        document.getElementById('canvas-step')?.addEventListener('click', () => pipelineController.step());

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

    subscribeToUpdates() {
        eventQueueBuffer.subscribe((event) => {
            if (!event) return;
            this.handlePipelineEvent(event);

            if (event.type === 'system:fleet-status') {
                this.handleFleetStatus(event.payload);
            }
        });
    },

    handleFleetStatus(fleetState) {
        if (PipelineStateManager.updateHealth(fleetState)) {
            if (this.selectedNode) this.refreshDrawer();
        }
    },

    handlePipelineEvent(entry) {
        const result = PipelineEventHandler.handleEvent(
            entry,
            (nodeId, color) => this.spawnRelevantParticles(nodeId, color),
            (fromId, toId) => this.spawnTravelingPackage(fromId, toId)
        );

        if (result && !result.redundant) {
            if (this.selectedNode === result.nodeId) this.refreshDrawer();
        }
    },

    spawnTravelingPackage(fromId, toId) {
        const fromNode = PIPELINE_NODES[fromId];
        const toNode = PIPELINE_NODES[toId];
        if (!fromNode || !toNode) return;

        PipelineStateManager.travelingPackages.push({
            fromId,
            toId,
            progress: 0,
            speed: 0.02,
            color: fromNode.activeColor || '#58a6ff'
        });
    },

    updateTravelingPackages() {
        const packages = PipelineStateManager.travelingPackages;
        for (let i = packages.length - 1; i >= 0; i--) {
            const pkg = packages[i];
            pkg.progress += pkg.speed;
            if (pkg.progress >= 1) {
                packages.splice(i, 1);
            }
        }
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

    spawnRelevantParticles(toNodeId, colorOverride = null) {
        const toNode = PIPELINE_NODES[toNodeId];
        CONNECTIONS.filter(c => c.to === toNodeId).forEach(conn => {
            const fromNode = PIPELINE_NODES[conn.from];
            if (!fromNode) return;

            PipelineStateManager.particles.push({
                fromX: fromNode.x * this.width,
                fromY: fromNode.y * this.height,
                toX: toNode.x * this.width,
                toY: toNode.y * this.height,
                startTime: Date.now(),
                duration: 1500 + Math.random() * 500,
                color: colorOverride || toNode.activeColor
            });
        });
    },

    startRenderLoop() {
        const render = () => {
            try {
                this.draw();
                this.animationId = requestAnimationFrame(render);
            } catch (err) {
                RendererLogger.error('[PipelineCanvas] Render crash:', {
                    context: { component: 'PipelineCanvas', error: err.message },
                    debugData: { stack: err.stack }
                });
                cancelAnimationFrame(this.animationId);
            }
        };
        render();
    },

    draw() {
        if (!this.ctx) return;

        this.updateTravelingPackages();
        PipelineStateManager.cleanupParticles();

        PipelineRenderer.clear(this.ctx, this.width, this.height);
        PipelineRenderer.drawConnections(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset);
        PipelineRenderer.drawParticles(this.ctx, PipelineStateManager.particles, PipelineInteraction.state.panOffset);
        PipelineRenderer.drawTravelingPackages(this.ctx, this.width, this.height, PipelineStateManager.travelingPackages, PipelineInteraction.state.panOffset);

        if (this.selectedNode) {
            PipelineRenderer.drawSelectionGlow(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset, this.selectedNode);
        }

        PipelineRenderer.drawNodes(
            this.ctx,
            this.width,
            this.height,
            PipelineInteraction.state.panOffset,
            PipelineStateManager.nodeStates,
            PipelineStateManager.nodeStats,
            this.hoveredNode,
            PipelineStateManager.nodeHealth
        );

        if (this.hoveredNode) {
            PipelineRenderer.drawTooltip(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset, this.hoveredNode, PipelineStateManager.nodeStats);
        }
    },

    selectNode(nodeId) {
        this.selectedNode = nodeId;
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
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.PIPELINE_DEBUG = null;
    }
};

export default PipelineCanvas;
