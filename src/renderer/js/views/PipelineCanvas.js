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
    nodeHealth: {}, // [NEW] Real hardware health (online/offline)
    nodeHistory: {},
    particles: [],
    travelingPackages: [], // ARCHITECTURE: Visual "items" in transit
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
                resize: () => this.resizeCanvas(),
                simulateSlot: (slotNum = 1) => this.simulateTaskInSlot(slotNum),
                simulateFault: (port = 8000, online = false) => {
                    this.handleFleetStatus({ [port]: { online } });
                }
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
        // NODES THAT ARE BUFFERS: They don't auto-decrement, 
        // they wait for a successor to "pull" the item.
        const bufferNodes = ['workers_hub', 'persistence', 'streaming'];

        Object.keys(PIPELINE_NODES).forEach(id => {
            this.nodeStates[id] = 'idle';
            this.nodeHealth[id] = true; // Default to online
            this.nodeStats[id] = {
                count: 0,
                lastEvent: null,
                isBuffer: bufferNodes.includes(id)
            };
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

            // [NEW] Distribute fleet health events
            if (event.type === 'system:fleet-status') {
                this.handleFleetStatus(event.payload);
            }
        });
    },

    /**
     * Update node health based on fleet telemetry
     */
    handleFleetStatus(fleetState) {
        if (!fleetState) return;

        Object.keys(PIPELINE_NODES).forEach(nodeId => {
            const node = PIPELINE_NODES[nodeId];
            if (node.port && fleetState[node.port]) {
                const isOnline = fleetState[node.port].online;
                if (this.nodeHealth[nodeId] !== isOnline) {
                    this.nodeHealth[nodeId] = isOnline;
                    console.log(`[PipelineCanvas] Node ${nodeId} health changed:`, isOnline ? 'ONLINE' : 'OFFLINE');
                }
            }
        });

        if (this.selectedNode) this.refreshDrawer();
    },

    handlePipelineEvent(entry) {
        const { type, payload } = entry;

        // DEBUG: Force logs for tracing slot issues
        console.log(`[Pipeline] Event: ${type}`, payload);

        const nodeId = this.findNodeForEvent(type);
        if (!nodeId) return;

        const status = payload?.status;

        // NODE HANDOVER LOGIC:
        // When a node starts, if it has a logical predecessor, we decrement the predecessor's count
        // to simulate the physical move of the "item" across the assembly line.
        if (status === 'start') {
            this.handleHandover(nodeId, payload);
            this.nodeStates[nodeId] = 'active';
            this.nodeStats[nodeId].count++;

            // DYNAMIC LABELS: Store info for workers
            if (nodeId.startsWith('worker_')) {
                const repoName = payload?.repo || '';
                const fileName = payload?.file || '';
                if (repoName && fileName) {
                    this.nodeStats[nodeId].currentLabel = `${repoName}/${fileName}`;
                    this.nodeStats[nodeId].repo = repoName;
                    this.nodeStats[nodeId].file = fileName;
                }
            }
        } else if (status === 'end') {
            // Mark node as a "pending source" for the next stage
            this.nodeStats[nodeId].isPendingHandover = true;
            this.nodeStats[nodeId].lastProcessedRepo = this.nodeStats[nodeId].repo;
            this.nodeStats[nodeId].lastProcessedFile = this.nodeStats[nodeId].file;

            // NEW: Instead of immediate decrement and clearing, we switch to PENDING
            // The predecessor's count and labels stay until the SUCCESSOR pulls them via handover.
            this.nodeStates[nodeId] = 'pending';

            // Note: We don't decrement count here if it's a slot, 
            // because handleHandover (of the next stage) will do it.
            const isSlot = nodeId.startsWith('worker_') && nodeId !== 'workers_hub';
            if (!isSlot) {
                this.nodeStats[nodeId].count = Math.max(0, this.nodeStats[nodeId].count - 1);
                if (this.nodeStats[nodeId].count === 0) {
                    this.nodeStates[nodeId] = 'idle';
                }
            }
        } else {
            // One-shot event (Non-buffer nodes pulse, Buffer nodes persist)
            this.handleHandover(nodeId, payload);
            this.nodeStates[nodeId] = 'active';
            this.nodeStats[nodeId].count++;

            // If it's NOT a buffer AND NOT A SLOT (Slots use start/end), decrement after 2s
            const isSlot = nodeId.startsWith('worker_') && nodeId !== 'workers_hub';
            if (!this.nodeStats[nodeId].isBuffer && !isSlot) {
                setTimeout(() => {
                    this.nodeStats[nodeId].count = Math.max(0, this.nodeStats[nodeId].count - 1);
                    if (this.nodeStats[nodeId].count === 0) {
                        this.nodeStates[nodeId] = 'idle';
                    }

                    if (this.selectedNode === nodeId) this.refreshDrawer();
                }, 2000);
            }
        }

        this.nodeStats[nodeId].lastEvent = type;

        // Track history
        const timestamp = new Date().toLocaleTimeString();
        const repo = payload?.repo || 'System';
        const file = payload?.file || 'Task Processed';

        this.nodeHistory[nodeId].unshift({
            time: timestamp,
            repo: repo,
            file: file,
            display: `${repo}: ${file}`
        });
        if (this.nodeHistory[nodeId].length > 40) this.nodeHistory[nodeId].pop();

        // Spawn particles for flow (only on start or one-shot)
        if (status !== 'end') {
            this.spawnRelevantParticles(nodeId);
        }

        // Update UI if inspecting
        if (this.selectedNode === nodeId) {
            this.refreshDrawer();
        }
    },

    /**
     * Decrement predecessor count to simulate handover
     */
    handleHandover(targetNodeId, payload) {
        // Define predecessors for the assembly line
        const predecessors = {
            'api_fetch': 'data_source',
            'cache': 'api_fetch',
            'classifier': 'cache',
            'workers_hub': 'classifier',
            'worker_1': 'workers_hub',
            'worker_2': 'workers_hub',
            'worker_3': 'workers_hub',
            'streaming': ['worker_1', 'worker_2', 'worker_3'],
            'mappers': 'streaming',
            'dna_synth': 'mappers',
            'intelligence': 'dna_synth',
            'persistence': 'intelligence'
        };

        const predDef = predecessors[targetNodeId];
        if (!predDef) return;

        // Find the best predecessor to decrement
        let predId = null;
        if (Array.isArray(predDef)) {
            // Shared node (streaming). Find a worker that just finished.
            predId = predDef.find(id => this.nodeStats[id].isPendingHandover);
            // Fallback: just pick one that has count > 0
            if (!predId) predId = predDef.find(id => this.nodeStats[id].count > 0);
            if (predId) this.nodeStats[predId].isPendingHandover = false;
        } else {
            predId = predDef;
        }

        if (predId && this.nodeStats[predId]) {
            // PIPELINE HIGHWAY: Create a "Traveling Package"
            this.spawnTravelingPackage(predId, targetNodeId);

            // SUCCESSOR PULL: Predecessor count is decremented ONLY when handover starts
            this.nodeStats[predId].count = Math.max(0, this.nodeStats[predId].count - 1);

            if (this.nodeStats[predId].count === 0) {
                this.nodeStates[predId] = 'idle';
                // Final cleanup of labels when buffer/slot is empty
                this.nodeStats[predId].currentLabel = null;
                this.nodeStats[predId].repo = null;
                this.nodeStats[predId].file = null;
            }
        }
    },

    spawnTravelingPackage(fromId, toId) {
        const fromNode = PIPELINE_NODES[fromId];
        const toNode = PIPELINE_NODES[toId];
        if (!fromNode || !toNode) return;

        // Visual travel parameters
        this.travelingPackages.push({
            fromId,
            toId,
            progress: 0,
            speed: 0.02, // Adjust for faster/slower travel
            color: fromNode.activeColor || '#58a6ff'
        });
    },

    updateTravelingPackages() {
        for (let i = this.travelingPackages.length - 1; i >= 0; i--) {
            const pkg = this.travelingPackages[i];
            pkg.progress += pkg.speed;

            if (pkg.progress >= 1) {
                // Package arrived! (We don't increment target count here because status="start" already did)
                // Actually, if we want a 100% accurate flow, we should increment target count HERE.
                // But the "start" event might have metadata we need.
                // For now, "start" increments target, Handover decrements pred and visualizes travel.
                this.travelingPackages.splice(i, 1);
            }
        }
    },

    refreshDrawer() {
        if (!this.selectedNode) return;
        PipelineUI.updateDrawer(this.selectedNode, this.nodeStats, this.nodeHistory, this.nodeStates, () => {
            this.selectedNode = null;
        });
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

        // Update animation logic
        this.updateTravelingPackages();

        PipelineRenderer.clear(this.ctx, this.width, this.height);

        // Background layers
        PipelineRenderer.drawConnections(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset);

        // Animation layer
        this.particles = this.particles.filter(p => (Date.now() - p.startTime) < p.duration);
        PipelineRenderer.drawParticles(this.ctx, this.particles, PipelineInteraction.state.panOffset);

        // NEW: Pipeline Highway (Visual packages)
        PipelineRenderer.drawTravelingPackages(this.ctx, this.width, this.height, this.travelingPackages, PipelineInteraction.state.panOffset);

        // Selection highlight
        if (this.selectedNode) {
            PipelineRenderer.drawSelectionGlow(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset, this.selectedNode);
        }

        // Action layer
        PipelineRenderer.drawNodes(this.ctx, this.width, this.height, PipelineInteraction.state.panOffset, this.nodeStates, this.nodeStats, this.hoveredNode, this.nodeHealth);

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

    /**
     * Simulation tool for visual verification
     */
    simulateTaskInSlot(slotNum = 1) {
        const slotId = `worker_slot_${slotNum}`;
        const repo = 'test-repo';
        const file = 'verify_flow.js';

        console.log(`[Simulator] Starting test sequence for ${slotId}...`);

        // 1. START: Processing
        this.handlePipelineEvent({
            type: slotId,
            payload: { status: 'start', repo, file }
        });

        // 2. END: Holding Result (Pending) after 3s
        setTimeout(() => {
            console.log(`[Simulator] Task finished, holding result in ${slotId}...`);
            this.handlePipelineEvent({
                type: slotId,
                payload: { status: 'end', repo, file }
            });

            // 3. HANDOVER: Picked up by Streaming Handler after another 3s
            setTimeout(() => {
                console.log(`[Simulator] Successor picking up result from ${slotId}...`);
                this.handlePipelineEvent({
                    type: 'streaming:batch',
                    payload: { status: 'start' }
                });
            }, 3000);
        }, 3000);
    },

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.PIPELINE_DEBUG = null;
    }
};

export default PipelineCanvas;
