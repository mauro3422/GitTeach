/**
 * DebugPipelineView.js
 * Visual component for the assembly line debugger.
 * SOLID: Single Responsibility - only handles debug visualization.
 */

import { pipelineController } from '../services/pipeline/PipelineController.js';
import { eventQueueBuffer } from '../services/pipeline/EventQueueBuffer.js';
import { fleetMonitor } from '../services/ai/FleetMonitor.js';
import { RendererLogger } from '../utils/RendererLogger.js';

export const DebugPipelineView = {
    els: {},
    isVisible: false,
    selectedItem: null,

    /**
     * Initialize the debugger view
     * @param {HTMLElement} container - Container element
     */
    init(container) {
        if (!container) {
            RendererLogger.warn('[DebugPipelineView] No container provided', { context: { component: 'DebugPipelineView' } });
            return;
        }

        this.container = container;
        this.render();
        this.cacheElements();
        this.bindEvents();
        this.subscribeToUpdates();

        RendererLogger.info('[DebugPipelineView] Initialized', { context: { component: 'DebugPipelineView' } });
    },

    /**
     * Render the debugger HTML structure
     */
    render() {
        this.container.innerHTML = `
            <div class="debugger-container" id="pipeline-debugger">
                <!-- Header -->
                <div class="debugger-header">
                    <span class="debugger-title">PIPELINE DEBUGGER</span>
                    <div class="state-indicator idle" id="dbg-state">
                        <span>IDLE</span>
                    </div>
                </div>

                <!-- Control Bar -->
                <div class="debugger-controls">
                    <button class="control-btn play" id="dbg-play" title="Play">▶</button>
                    <button class="control-btn pause" id="dbg-pause" title="Pause" disabled>⏸</button>
                    <button class="control-btn step" id="dbg-step" title="Step" disabled>⏭</button>
                    
                    <div class="debugger-stats">
                        <div class="stat-item">
                            <span class="stat-value" id="dbg-stat-queue">0</span>
                            <span class="stat-label">Queue</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="dbg-stat-processed">0</span>
                            <span class="stat-label">Done</span>
                        </div>
                        <div class="stat-item errors">
                            <span class="stat-value" id="dbg-stat-errors">0</span>
                            <span class="stat-label">Errors</span>
                        </div>
                    </div>
                </div>

                <!-- Assembly Lines -->
                <div class="assembly-lanes" id="dbg-lanes">
                    <!-- GPU Lane (Port 8000) -->
                    <div class="lane gpu" id="lane-8000">
                        <div class="lane-header">
                            <span class="lane-title">WORKERS</span>
                            <span class="lane-port">GPU:8000</span>
                        </div>
                        <div class="lane-slots" id="slots-8000">
                            <!-- Slots will be rendered here -->
                        </div>
                        <div class="lane-output">
                            <span class="output-count" id="output-8000">0</span>
                            <span class="output-label">processed</span>
                        </div>
                    </div>

                    <!-- Mappers Lane (Port 8002) -->
                    <div class="lane mappers" id="lane-8002">
                        <div class="lane-header">
                            <span class="lane-title">MAPPERS</span>
                            <span class="lane-port">CPU:8002</span>
                        </div>
                        <div class="lane-slots" id="slots-8002">
                            <!-- Slots will be rendered here -->
                        </div>
                        <div class="lane-output">
                            <span class="output-count" id="output-8002">0</span>
                            <span class="output-label">processed</span>
                        </div>
                    </div>

                    <!-- Embeddings Lane (Port 8001) -->
                    <div class="lane embeddings" id="lane-8001">
                        <div class="lane-header">
                            <span class="lane-title">VECTORS</span>
                            <span class="lane-port">EMB:8001</span>
                        </div>
                        <div class="lane-slots" id="slots-8001">
                            <!-- Slots will be rendered here -->
                        </div>
                        <div class="lane-output">
                            <span class="output-count" id="output-8001">0</span>
                            <span class="output-label">processed</span>
                        </div>
                    </div>
                </div>

                <!-- Inspection Panel (hidden by default) -->
                <div class="inspection-panel" id="dbg-inspection">
                    <div class="inspection-header">
                        <span class="inspection-title" id="inspection-title">Event Details</span>
                        <button class="inspection-close" id="inspection-close">×</button>
                    </div>
                    <pre class="inspection-content" id="inspection-content"></pre>
                    <div class="inspection-actions">
                        <button class="inspection-btn" id="inspection-copy">📋 Copy JSON</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Cache DOM element references
     */
    cacheElements() {
        this.els = {
            container: document.getElementById('pipeline-debugger'),
            state: document.getElementById('dbg-state'),
            playBtn: document.getElementById('dbg-play'),
            pauseBtn: document.getElementById('dbg-pause'),
            stepBtn: document.getElementById('dbg-step'),
            statQueue: document.getElementById('dbg-stat-queue'),
            statProcessed: document.getElementById('dbg-stat-processed'),
            statErrors: document.getElementById('dbg-stat-errors'),
            lanes: {
                8000: document.getElementById('lane-8000'),
                8001: document.getElementById('lane-8001'),
                8002: document.getElementById('lane-8002')
            },
            slots: {
                8000: document.getElementById('slots-8000'),
                8001: document.getElementById('slots-8001'),
                8002: document.getElementById('slots-8002')
            },
            outputs: {
                8000: document.getElementById('output-8000'),
                8001: document.getElementById('output-8001'),
                8002: document.getElementById('output-8002')
            },
            inspection: document.getElementById('dbg-inspection'),
            inspectionTitle: document.getElementById('inspection-title'),
            inspectionContent: document.getElementById('inspection-content'),
            inspectionClose: document.getElementById('inspection-close'),
            inspectionCopy: document.getElementById('inspection-copy')
        };
    },

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Control buttons
        this.els.playBtn?.addEventListener('click', () => this.handlePlay());
        this.els.pauseBtn?.addEventListener('click', () => this.handlePause());
        this.els.stepBtn?.addEventListener('click', () => this.handleStep());

        // Inspection panel
        this.els.inspectionClose?.addEventListener('click', () => this.hideInspection());
        this.els.inspectionCopy?.addEventListener('click', () => this.copyInspection());
    },

    /**
     * Subscribe to state updates
     */
    subscribeToUpdates() {
        // Pipeline controller state
        pipelineController.subscribe((state) => this.updateState(state));

        // Event buffer updates
        eventQueueBuffer.subscribe((entry, stats) => {
            this.updateStats(stats);
            if (entry) this.animateEvent(entry);
        });

        // Fleet monitor for slot states
        fleetMonitor.subscribe((fleetState) => this.updateSlots(fleetState));
    },

    /**
     * Handle Play button
     */
    handlePlay() {
        pipelineController.play();
    },

    /**
     * Handle Pause button
     */
    handlePause() {
        pipelineController.pause();
    },

    /**
     * Handle Step button
     */
    async handleStep() {
        this.els.stepBtn.disabled = true;
        await pipelineController.step();
        this.els.stepBtn.disabled = false;
    },

    /**
     * Update state indicator
     */
    updateState(state) {
        const el = this.els.state;
        if (!el) return;

        el.className = `state-indicator ${state.toLowerCase()}`;
        el.querySelector('span').textContent = state;

        // Update button states
        const isRunning = state === 'RUNNING';
        const isPausedOrIdle = state === 'PAUSED' || state === 'IDLE';

        if (this.els.playBtn) this.els.playBtn.disabled = isRunning;
        if (this.els.pauseBtn) this.els.pauseBtn.disabled = !isRunning;
        if (this.els.stepBtn) this.els.stepBtn.disabled = !isPausedOrIdle;
    },

    /**
     * Update statistics display
     */
    updateStats(stats) {
        if (this.els.statQueue) this.els.statQueue.textContent = stats.queued + stats.processing;
        if (this.els.statProcessed) this.els.statProcessed.textContent = stats.done;
        if (this.els.statErrors) this.els.statErrors.textContent = stats.errors;
    },

    /**
     * Update slot visualization from fleet state
     */
    updateSlots(fleetState) {
        for (const port of [8000, 8001, 8002]) {
            const container = this.els.slots[port];
            const data = fleetState[port];

            if (!container || !data) continue;

            // Re-render slots
            container.innerHTML = '';

            const slots = data.slots || [];
            slots.forEach((slot, i) => {
                const slotEl = document.createElement('div');
                slotEl.className = `slot ${slot.state}`;
                slotEl.innerHTML = `
                    <span class="slot-id">Slot ${i}</span>
                    <span class="slot-content">${slot.state === 'processing' ? '⚡ Active' : 'Idle'}</span>
                    <div class="slot-progress">
                        <div class="slot-progress-fill" style="width: ${slot.state === 'processing' ? '60%' : '0%'}"></div>
                    </div>
                `;
                container.appendChild(slotEl);
            });

            // Update lane processing state
            const lane = this.els.lanes[port];
            const hasProcessing = slots.some(s => s.state === 'processing');
            if (lane) {
                lane.classList.toggle('processing', hasProcessing);
            }
        }
    },

    /**
     * Animate an event flowing through the lane
     */
    animateEvent(entry) {
        const lane = this.els.lanes[entry.port];
        if (!lane) return;

        // Update output count for done events
        if (entry.status === 'done') {
            const output = this.els.outputs[entry.port];
            if (output) {
                const current = parseInt(output.textContent) || 0;
                output.textContent = current + 1;
            }
        }
    },

    /**
     * Show inspection panel for an item
     */
    showInspection(item) {
        this.selectedItem = item;

        if (this.els.inspectionTitle) {
            this.els.inspectionTitle.textContent = `${item.type} - ${item.display}`;
        }

        if (this.els.inspectionContent) {
            this.els.inspectionContent.textContent = JSON.stringify(item.payload, null, 2);
        }

        if (this.els.inspection) {
            this.els.inspection.classList.add('visible');
        }
    },

    /**
     * Hide inspection panel
     */
    hideInspection() {
        if (this.els.inspection) {
            this.els.inspection.classList.remove('visible');
        }
        this.selectedItem = null;
    },

    /**
     * Copy inspection content to clipboard
     */
    async copyInspection() {
        if (!this.selectedItem) return;

        try {
            await navigator.clipboard.writeText(JSON.stringify(this.selectedItem.payload, null, 2));
            this.els.inspectionCopy.textContent = '✅ Copied!';
            setTimeout(() => {
                this.els.inspectionCopy.textContent = '📋 Copy JSON';
            }, 2000);
        } catch (e) {
            RendererLogger.error('[DebugPipelineView] Copy failed:', {
                context: { component: 'DebugPipelineView', error: e.message },
                debugData: { stack: e.stack }
            });
        }
    },

    /**
     * Toggle visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        if (this.container) {
            this.container.style.display = this.isVisible ? 'block' : 'none';
        }
    },

    /**
     * Show debugger
     */
    show() {
        this.isVisible = true;
        if (this.container) {
            this.container.style.display = 'block';
        }
    },

    /**
     * Hide debugger
     */
    hide() {
        this.isVisible = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
};

export default DebugPipelineView;
