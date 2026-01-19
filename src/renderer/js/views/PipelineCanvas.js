/**
 * PipelineCanvas.js
 * Canvas-based visualization of the AI pipeline flow.
 * Orchestrates rendering, interaction, and data updates.
 */

import { pipelineController } from '../services/pipeline/PipelineController.js';
import { eventQueueBuffer } from '../services/pipeline/EventQueueBuffer.js';
import { PIPELINE_NODES, CONNECTIONS, EVENT_NODE_MAP } from './pipeline/PipelineConstants.js';
import { PipelineRenderer } from './pipeline/PipelineRenderer.js';
import { PipelineInteraction } from './pipeline/PipelineInteraction.js';
import { PipelineUI } from './pipeline/PipelineUI.js';

export const PipelineCanvas = {
    canvas: null,
    ctx: null,
    container: null,
    animationId: null,

    // Node states and metadata
    nodeStates: {},
    nodeStats: {},
    nodeHistory: {},
    particles: [],
    hoveredNode: null,
    selectedNode: null,

    // Configuration
    width: 0,
    height: 600,

    /**
     * Initialize the visualizer
     * @param {HTMLElement} container 
     */
    init(container) {
        if (!container) return;
        this.container = container;

        try {
            this.createCanvas();
            this.initNodeStates();
            this.bindEvents();
            this.subscribeToUpdates();
            this.startRenderLoop();

            // Exposure for debugging
            window.PIPELINE_DEBUG = {
                audit: () => this.auditState(),
                resize: () => this.resizeCanvas()
            };

            console.log('[PipelineCanvas] Orchestrator initialized');
        } catch (err) {
            console.error('[PipelineCanvas] Init failed:', err);
        }
    },

    auditState() {
        console.group('PipelineCanvas State Audit');
        console.log('Nodes:', Object.keys(this.nodeStates).length);
        console.log('Active Particles:', this.particles.length);
        console.log('Pan Offset:', PipelineInteraction.state.panOffset);
        console.groupEnd();
    },

    createCanvas() {
        // Create canvas structure
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

    initNodeStates() {
        Object.keys(PIPELINE_NODES).forEach(id => {
            this.nodeStates[id] = 'idle';
            this.nodeStats[id] = { count: 0, lastEvent: null };
            this.nodeHistory[id] = [];
        });
    },

    bindEvents() {
        // Pipeline Controls
        document.getElementById('canvas-play')?.addEventListener('click', () => pipelineController.play());
        document.getElementById('canvas-pause')?.addEventListener('click', () => pipelineController.pause());
        document.getElementById('canvas-step')?.addEventListener('click', () => pipelineController.step());

        // Delegate interactions
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
            if (!event) return; // Handle clear buffer
            this.handlePipelineEvent(event);
        });
    },

    handlePipelineEvent(entry) {
        const { type, payload } = entry;
        const nodeId = this.findNodeForEvent(type);
        if (!nodeId) return;

        // Update state and stats
        this.nodeStates[nodeId] = 'active';
        this.nodeStats[nodeId].count++;
        this.nodeStats[nodeId].lastEvent = type;

        // Track history
        const timestamp = new Date().toLocaleTimeString();
        this.nodeHistory[nodeId].unshift({
            time: timestamp,
            display: `${type.toUpperCase()}: ${payload?.file || payload?.repo || 'Processed'}`
        });
        if (this.nodeHistory[nodeId].length > 10) this.nodeHistory[nodeId].pop();

        // Spawn particles for flow
        this.spawnRelevantParticles(nodeId);

        // Update UI if inspecting
        if (this.selectedNode === nodeId) {
            PipelineUI.updateDrawer(this.selectedNode, this.nodeStats, this.nodeHistory, this.nodeStates, () => {
                this.selectedNode = null;
            });
        }

        // Auto-idle after delay
        setTimeout(() => {
            if (this.nodeStats[nodeId].lastEvent === event) {
                this.nodeStates[nodeId] = 'idle';
            }
        }, 3000);
    },

    findNodeForEvent(event) {
        for (const [prefix, nodeId] of Object.entries(EVENT_NODE_MAP)) {
            if (event.startsWith(prefix)) return nodeId;
        }
        return null;
    },

    spawnRelevantParticles(toNodeId) {
        const toNode = PIPELINE_NODES[toNodeId];
        CONNECTIONS.filter(c => c.to === toNodeId).forEach(conn => {
            const fromNode = PIPELINE_NODES[conn.from];
            if (!fromNode) return;

            const p = {
                fromX: fromNode.x * this.width,
                fromY: fromNode.y * this.height,
                toX: toNode.x * this.width,
                toY: toNode.y * this.height,
                startTime: Date.now(),
                duration: 1500 + Math.random() * 500,
                color: toNode.activeColor
            };
            this.particles.push(p);
        });
    },

    startRenderLoop() {
        const render = () => {
            try {
                this.draw();
                this.animationId = requestAnimationFrame(render);
            } catch (err) {
                console.error('[PipelineCanvas] Render crash:', err);
                cancelAnimationFrame(this.animationId);
            }
        };
        render();
    },

    draw() {
        if (!this.ctx) return;

        PipelineRenderer.clear(this.ctx, this.width, this.height);

        // Background layers
        PipelineRenderer.drawConnections(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset);

        // Animation layer
        this.particles = this.particles.filter(p => (Date.now() - p.startTime) < p.duration);
        PipelineRenderer.drawParticles(this.ctx, this.particles, PipelineInteraction.state.panOffset);

        // Selection highlight
        if (this.selectedNode) {
            PipelineRenderer.drawSelectionGlow(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset, this.selectedNode);
        }

        // Action layer
        PipelineRenderer.drawNodes(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset, this.nodeStates, this.nodeStats, this.hoveredNode);

        // Overlay layer
        if (this.hoveredNode) {
            PipelineRenderer.drawTooltip(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset, this.hoveredNode, this.nodeStats);
        }
    },

    selectNode(nodeId) {
        this.selectedNode = nodeId;
        PipelineUI.showDrawer(this.container, nodeId, this.nodeStats, this.nodeHistory, this.nodeStates, () => {
            this.selectedNode = null;
        });
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
