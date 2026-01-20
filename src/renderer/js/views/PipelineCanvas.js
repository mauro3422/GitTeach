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

import { PipelineStateManager } from './pipeline/PipelineStateManager.js';
import { PipelineEventHandler } from './pipeline/PipelineEventHandler.js';
import { LayoutEngine } from './pipeline/LayoutEngine.js';
import { PipelineSimulation } from './pipeline/PipelineSimulation.js';

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

        // Create Header
        const header = document.createElement('div');
        header.className = 'canvas-header';
        header.innerHTML = `
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
            (nodeId, color) => PipelineStateManager.addParticles(nodeId, color),
            (fromId, toId, file) => PipelineStateManager.addTravelingPackage(fromId, toId, file)
        );

        if (result && !result.redundant) {
            if (this.selectedNode === result.nodeId) this.refreshDrawer();
        }
    },

    spawnTravelingPackage(fromId, toId, file = null) {
        // This method is now deprecated as handlePipelineEvent directly calls PipelineStateManager.addTravelingPackage
        // Keeping it for potential external calls, but internal logic should use smartSpawn or direct PipelineStateManager calls.
        PipelineStateManager.addTravelingPackage(fromId, toId, file);
    },

    updateTravelingPackages() {
        const packages = PipelineStateManager.travelingPackages;
        for (let i = packages.length - 1; i >= 0; i--) {
            const pkg = packages[i];
            pkg.progress += pkg.speed || 0.02;
            if (pkg.progress >= 1) {
                packages.splice(i, 1);
            }
        }
    },

    /**
     * Gentle Camera: Auto-pans towards the activity hub
     */
    updateCamera() {
        // Don't auto-pan if the user is currently interacting or has manual control
        if (PipelineInteraction.state.isPanning || !PipelineInteraction.state.autoFollow) return;

        const focalPoint = LayoutEngine.getFocalPoint(this.width, this.height, PipelineStateManager.nodeStates, this.selectedNode || this.hoveredNode);
        const { zoomScale } = PipelineInteraction.state;

        // Calculate the target pan that would put focalPoint in the center of the viewport
        // World coordinates -> Screen coordinates (center of focal point)
        const targetPanX = (this.width / 2) - (focalPoint.x * zoomScale);
        const targetPanY = (this.height / 2) - (focalPoint.y * zoomScale);

        // Smooth drift (LERP)
        const lerpFactor = 0.08; // Slightly faster for responsiveness
        PipelineInteraction.state.panOffset.x += (targetPanX - PipelineInteraction.state.panOffset.x) * lerpFactor;
        PipelineInteraction.state.panOffset.y += (targetPanY - PipelineInteraction.state.panOffset.y) * lerpFactor;
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
        const toPos = LayoutEngine.getNodePos(toNodeId);

        CONNECTIONS.filter(c => c.to === toNodeId).forEach(conn => {
            const fromPos = LayoutEngine.getNodePos(conn.from);
            const toNode = PIPELINE_NODES[toNodeId];

            PipelineStateManager.particles.push({
                fromX: fromPos.x,
                fromY: fromPos.y,
                toX: toPos.x,
                toY: toPos.y,
                startTime: Date.now(),
                duration: 1500 + Math.random() * 500,
                color: colorOverride || toNode?.activeColor || '#58a6ff'
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
        this.updateCamera();
        PipelineStateManager.cleanupParticles();

        PipelineRenderer.prepare(this.ctx, this.width, this.height);

        // --- GLOBAL TRANSFORM START ---
        this.ctx.save();
        this.ctx.translate(PipelineInteraction.state.panOffset.x, PipelineInteraction.state.panOffset.y);
        this.ctx.scale(PipelineInteraction.state.zoomScale, PipelineInteraction.state.zoomScale);

        PipelineRenderer.drawConnections(this.ctx, this.width, this.height, PipelineStateManager.nodeStats);
        PipelineRenderer.drawParticles(this.ctx, PipelineStateManager.particles);
        PipelineRenderer.drawTravelingPackages(this.ctx, this.width, this.height, PipelineStateManager.travelingPackages);
        PipelineRenderer.drawPulses(this.ctx, PipelineStateManager.pulses);

        if (this.selectedNode) {
            PipelineRenderer.drawSelectionGlow(this.ctx, this.width, this.height, this.selectedNode);
        }

        PipelineRenderer.drawNodes(
            this.ctx,
            this.width,
            this.height,
            PipelineStateManager.nodeStates,
            PipelineStateManager.nodeStats,
            this.hoveredNode,
            PipelineStateManager.nodeHealth
        );

        if (this.hoveredNode && !this.selectedNode) {
            PipelineRenderer.drawTooltip(this.ctx, this.width, this.height, this.hoveredNode, PipelineStateManager.nodeStats);
        }

        this.ctx.restore();
        // --- GLOBAL TRANSFORM END ---
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
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.PIPELINE_DEBUG = null;
    }
};

export default PipelineCanvas;
