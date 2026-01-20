/**
 * TracerView.js
 * Controller for the Electron-based Tracer view.
 * Orchestrates the ProfileAnalyzer pipeline in the renderer.
 */

import { ProfileAnalyzer } from '../services/profileAnalyzer.js';
import { logManager } from '../utils/logManager.js';
import { AIService } from '../services/aiService.js';
import { memoryManager } from '../services/memory/MemoryManager.js';
import { fleetMonitor } from '../services/ai/FleetMonitor.js';
import { PipelineCanvas } from './PipelineCanvas.js';
import { DebugLogger } from '../utils/debugLogger.js';
import { pipelineController } from '../services/pipeline/PipelineController.js';
import { eventQueueBuffer } from '../services/pipeline/EventQueueBuffer.js';
import { RendererLogger } from '../utils/RendererLogger.js';

export const TracerView = {
    els: {},
    analyzer: null,
    isProcessing: false,
    state: 'IDLE', // IDLE, VERIFYING, READY, RUNNING, STOPPING

    async init() {
        try {
            window.IS_TRACER = true;
            window.FORCE_REAL_AI = true;

            RendererLogger.info('[TracerView] Caching elements...', { context: { component: 'TracerView' } });
            this.cacheElements();

            RendererLogger.info('[TracerView] Binding events...', { context: { component: 'TracerView' } });
            this.bindEvents();

            RendererLogger.info('[TracerView] Pre-flight checks...', { context: { component: 'TracerView' } });
            this.checkAIStatus();
            this.loadRecentSession();

            // Enable forensic logging
            DebugLogger.setEnabled(true);

            // Initialize Services
            await fleetMonitor.init();
            fleetMonitor.subscribe((state) => this.renderFleet(state));

            logManager.addTransport({
                log: (level, msg, ctx) => this.renderLog(level, msg, ctx)
            });

            // Safeguard sessionId access
            const sessionEl = this.els.sessionId;
            if (sessionEl) {
                const rawId = sessionEl.textContent?.replace('SESSION: ', '') || 'UNKNOWN';
                window.CURRENT_SESSION_ID = rawId;
                RendererLogger.info(`[TracerView] Session ID: ${rawId}`, { context: { component: 'TracerView', sessionId: rawId } });
            }

            this.updateButtonUI();

            // Initialize Pipeline Canvas AFTER caching
            if (this.els.debuggerContainer) {
                RendererLogger.info('[TracerView] Initializing PipelineCanvas...', { context: { component: 'TracerView' } });
                PipelineCanvas.init(this.els.debuggerContainer);
            }

            RendererLogger.info('[TracerView] Initialization Complete', { context: { component: 'TracerView' } });
            setTimeout(() => this.verifyFleet(), 500);
        } catch (e) {
            RendererLogger.error('[TracerView] FATAL_INIT_ERROR:', {
                context: { component: 'TracerView', error: e.message },
                debugData: { stack: e.stack }
            });
        }
    },

    cacheElements() {
        this.els = {
            btnRun: document.getElementById('btn-run-tracer'),
            repoTargets: document.getElementById('repo-targets'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            queueText: document.getElementById('queue-text'),
            aiStatus: document.getElementById('ai-status'),
            logStream: document.getElementById('log-stream'),
            workerInfo: document.getElementById('active-worker-info'),
            sessionId: document.getElementById('session-id'),
            fleet: {
                8000: document.getElementById('fleet-8000'),
                8001: document.getElementById('fleet-8001'),
                8002: document.getElementById('fleet-8002')
            },
            // Debugger elements
            debuggerSection: document.getElementById('debugger-section'),
            debuggerContainer: document.getElementById('debugger-container'),
            btnToggleDebugger: document.getElementById('btn-toggle-debugger')
        };
    },

    bindEvents() {
        this.els.btnRun.addEventListener('click', () => this.handleAction());

        // Toggle debugger visibility
        if (this.els.btnToggleDebugger) {
            this.els.btnToggleDebugger.addEventListener('click', () => this.toggleDebugger());
        }
    },

    /**
     * Toggle Pipeline Canvas visibility
     */
    toggleDebugger() {
        RendererLogger.info('[TracerView] Toggling Debugger...', { context: { component: 'TracerView' } });
        const section = this.els.debuggerSection;
        const btn = this.els.btnToggleDebugger;

        if (!section) {
            RendererLogger.error('[TracerView] FATAL: debuggerSection (DOM id: debugger-section) not found in cache', {
                context: { component: 'TracerView' }
            });
            return;
        }

        const isCurrentlyHidden = section.classList.contains('hidden') || section.style.display === 'none';

        RendererLogger.info('[TracerView] Debugger current state:', {
            context: {
                component: 'TracerView',
                isCurrentlyHidden,
                classList: section.className,
                display: section.style.display
            }
        });

        if (isCurrentlyHidden) {
            // SHOW
            section.classList.remove('hidden');
            section.style.display = 'flex';
            if (btn) btn.classList.add('active');

            RendererLogger.info('[TracerView] Debugger FORCED TO VISIBLE', { context: { component: 'TracerView' } });

            // Critical for Canvas geometry
            setTimeout(() => {
                RendererLogger.info('[TracerView] Recalculating Canvas Geometry...', { context: { component: 'TracerView' } });
                PipelineCanvas.resizeCanvas();
            }, 50);
        } else {
            // HIDE
            section.classList.add('hidden');
            section.style.display = 'none';
            if (btn) btn.classList.remove('active');

            RendererLogger.info('[TracerView] Debugger FORCED TO HIDDEN', { context: { component: 'TracerView' } });
        }
    },

    /**
     * Handle button clicks based on current state
     */
    async handleAction() {
        if (this.state === 'IDLE') {
            await this.verifyFleet();
        } else if (this.state === 'READY') {
            await this.startAnalysis();
        } else if (this.state === 'RUNNING') {
            await this.stopAnalysis();
        }
    },

    /**
     * Step 1: Health Check (Visual Ping)
     */
    async verifyFleet() {
        this.state = 'VERIFYING';
        this.updateButtonUI();

        this.renderLog('INFO', 'INITIATING_PRE-FLIGHT_HEALTH_CHECK...');
        if (window.fleetAPI?.verify) {
            await window.fleetAPI.verify();
            this.renderLog('INFO', 'AI_FLEET_STATUS: VERIFIED');

            // Visual success flash: momentarily show "ready" state on dots
            this.renderReadyFlash();
            await new Promise(r => setTimeout(r, 600));
        }

        this.state = 'READY';
        this.updateButtonUI();
    },

    /**
     * Update button text and style based on state
     */
    updateButtonUI() {
        const btn = this.els.btnRun;
        switch (this.state) {
            case 'IDLE':
                btn.textContent = '🔍 VERIFY_AI_FLEET';
                btn.style.background = 'linear-gradient(90deg, #21262d, #30363d)';
                btn.disabled = false;
                break;
            case 'VERIFYING':
                btn.textContent = '⌛ VERIFYING_FLEET...';
                btn.disabled = true;
                break;
            case 'READY':
                btn.textContent = '🚀 START_FLIGHT_RECODER';
                btn.style.background = 'linear-gradient(90deg, #238636, #2ea043)';
                btn.disabled = false;
                break;
            case 'RUNNING':
                btn.textContent = '🛑 STOP_ANALYSIS';
                btn.style.background = 'linear-gradient(90deg, #da3633, #f85149)';
                btn.disabled = false;
                break;
            case 'STOPPING':
                btn.textContent = '⌛ STOPPING...';
                btn.disabled = true;
                break;
        }
    },

    async checkAIStatus() {
        try {
            await AIService.callAI("Health check", "Are you online?", 1);
            this.els.aiStatus.textContent = 'AI: ONLINE';
            this.els.aiStatus.className = 'status-badge online';
        } catch (e) {
            this.els.aiStatus.textContent = 'AI: OFFLINE';
            this.els.aiStatus.className = 'status-badge offline';
        }
    },

    /**
     * Render the entire fleet state including individual slots
     * @param {Object} state - { 8000: { online, total_slots, slots: [] }, ... }
     */
    renderFleet(state) {
        for (const port in state) {
            const container = this.els.fleet[port];
            if (!container) continue;

            const data = state[port];
            const statusEl = container.querySelector('.fleet-status');
            const slotsContainer = container.querySelector('.slots-grid');

            if (!data.online) {
                if (statusEl) {
                    statusEl.textContent = 'DISCONNECTED';
                    statusEl.style.color = '#8b949e';
                }
                if (slotsContainer) slotsContainer.innerHTML = '';
                continue;
            }

            if (statusEl) {
                statusEl.textContent = `${data.total_slots} SLOTS TOTAL`;
                statusEl.style.color = '#3fb950';
            }

            // Render slots grid
            if (slotsContainer) {
                slotsContainer.innerHTML = '';
                data.slots.forEach(slot => {
                    const dot = document.createElement('div');
                    dot.className = `slot-dot ${slot.state}`;
                    dot.title = `Slot ${slot.id}: ${slot.state} ${slot.n_remain > 0 ? `(${slot.n_remain} rem)` : ''}`;
                    slotsContainer.appendChild(dot);
                });

                // If we know total_slots but slots array is empty (e.g. server just started)
                if (data.slots.length === 0 && data.total_slots > 0) {
                    for (let i = 0; i < data.total_slots; i++) {
                        const dot = document.createElement('div');
                        dot.className = 'slot-dot idle';
                        slotsContainer.appendChild(dot);
                    }
                }
            }
        }
    },

    loadRecentSession() {
        const id = `TRACE_${new Date().getTime()}`;
        this.els.sessionId.textContent = `SESSION: ${id}`;
    },

    renderLog(level, msg, ctx) {
        if (!this.els.logStream) return;

        const div = document.createElement('div');

        // Map numeric level to name if needed
        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const levelStr = (typeof level === 'number') ? levelNames[level] : level;

        div.className = `log-entry ${(levelStr || 'info').toLowerCase()}`;
        const time = new Date().toLocaleTimeString();
        div.textContent = `[${time}] [${ctx?.component || 'SYSTEM'}] ${msg}`;

        this.els.logStream.appendChild(div);

        // Auto-scroll logic
        this.els.logStream.scrollTop = this.els.logStream.scrollHeight;

        // Keep logs manageable
        if (this.els.logStream.children.length > 300) {
            this.els.logStream.removeChild(this.els.logStream.firstChild);
        }
    },

    async startAnalysis() {
        if (this.state !== 'READY') return;
        this.state = 'RUNNING';
        this.updateButtonUI();

        try {
            const username = 'mauro3422'; // Default for tracer

            // Read dynamic config from UI
            const maxRepos = parseInt(document.getElementById('cfg-max-repos').value) || 10;
            const maxAnchors = parseInt(document.getElementById('cfg-max-files').value) || 10;

            this.renderLog('INFO', `Config: ${maxRepos} repos, ${maxAnchors} files per repo.`);

            // Check auth via Electron API
            const auth = await window.githubAPI.checkAuth();
            if (!auth) {
                this.renderLog('ERROR', 'No GitHub authentication found. Please login in the main app first.');
                this.state = 'IDLE';
                this.updateButtonUI();
                return;
            }

            // Start Forensic Session
            const sessionId = `TRACE_${username}_${Date.now()}`;
            await DebugLogger.startSession(sessionId);

            // Sync Visualizer state
            eventQueueBuffer.clear();
            pipelineController.play();

            // ISOLATION: Switch LevelDB and Mirroring to the session folder
            if (window.cacheAPI && window.cacheAPI.switchSession) {
                this.renderLog('INFO', `Switching to session database: ${sessionId}/db`);
                await window.cacheAPI.switchSession(sessionId);
            }

            // Initialize Analyzer with real Electron context
            this.analyzer = new ProfileAnalyzer();

            // Set up status callbacks
            const onStep = (step) => {
                if (this.state === 'STOPPING') return; // Ignore updates while stopping

                if (step.type === 'Progreso') {
                    const stats = this.analyzer.coordinator.getStats();
                    this.updateUI(stats, step.phase || 'PROCESSING');
                } else if (step.type === 'WorkerUpdate') {
                    this.els.workerInfo.textContent = `[Worker ${step.workerId}] ${step.message}`;
                    // Also update stats on worker updates
                    const stats = this.analyzer.coordinator.getStats();
                    this.updateUI(stats, 'ANALYZING');
                } else if (step.type === 'StreamingUpdate') {
                    this.renderLog('INFO', step.message);
                    this.els.workerInfo.textContent = step.message;
                }
            };

            // SYNC FLEET LIMITS: Inform main process about slot capping
            if (window.fleetAPI?.setLimits) {
                await window.fleetAPI.setLimits({
                    8001: 2, // Hard capped for vectors
                    8002: maxRepos > 5 ? 4 : 2 // Dynamic cap for mappers based on load
                });
            }

            // Run analysis with dynamic config
            await this.analyzer.analyze(username, onStep, { maxRepos, maxAnchors });

            this.renderLog('INFO', 'Analysis complete! Generating Summary...');
            const stats = this.analyzer.coordinator.getStats();

            // Add repo list to stats for the summary
            stats.reposAnalyzed = this.analyzer.coordinator.inventory.repos.map(r => r.name);

            await window.cacheAPI.generateSummary(stats);
            await DebugLogger.endSession();
            pipelineController.stop();

            this.renderLog('INFO', `Summary generated in logs/tracer_logs/SUMMARY.json`);
            this.updateUI(100, stats);
            this.state = 'IDLE';

        } catch (error) {
            this.renderLog('ERROR', `Pipeline failure: ${error.message}`);
            RendererLogger.error('Pipeline failure:', {
                context: { component: 'TracerView', error: error.message },
                debugData: { stack: error.stack }
            });
            this.state = 'IDLE';
        } finally {
            this.updateButtonUI();

            // SESSION CLEANUP: Revert to global DB
            if (window.cacheAPI && window.cacheAPI.switchSession) {
                await window.cacheAPI.switchSession(null);
            }
        }
    },

    /**
     * Kill the current analysis
     */
    async stopAnalysis() {
        if (!this.analyzer || this.state !== 'RUNNING') return;
        this.state = 'STOPPING';
        this.updateButtonUI();

        this.renderLog('WARN', '🛑 ABORTING_ANALYSIS...');
        this.analyzer.stop();

        // Wait a bit for workers to exit
        await new Promise(r => setTimeout(r, 1000));

        this.state = 'IDLE';
        this.updateButtonUI();
        pipelineController.stop();
        this.renderLog('INFO', 'Analysis aborted by user.');
    },

    /**
     * Brief visual flash to show verification success
     */
    renderReadyFlash() {
        const dots = document.querySelectorAll('.slot-dot');
        dots.forEach(dot => {
            if (!dot.classList.contains('error')) {
                dot.classList.add('ready');
                setTimeout(() => dot.classList.remove('ready'), 600);
            }
        });
    },

    updateUI(stats, phase = 'PROCESSING') {
        const analyzed = stats.analyzed || 0;
        const total = stats.totalFiles || 0;

        // Calculate real percentage from stats
        const percent = total > 0 ? Math.round((analyzed / total) * 100) : 0;

        this.els.progressFill.style.width = `${percent}%`;
        this.els.progressText.textContent = `${percent}%`;
        this.els.queueText.textContent = `${analyzed} / ${total} files`;

        // Update status message based on phase
        const phaseMessages = {
            'SCANNING': '🔍 Scanning repositories...',
            'QUEUING': '📋 Building file queue...',
            'ANALYZING': '🧠 AI analyzing files...',
            'PROCESSING': '⚙️ Processing...',
            'CURATING': '✨ Curating insights...',
            'SYNTHESIZING': '🧬 Synthesizing profile...',
            'COMPLETE': '✅ Analysis complete!'
        };

        if (this.els.workerInfo && phase !== 'WorkerUpdate') {
            const msg = phaseMessages[phase] || phaseMessages['PROCESSING'];
            // Only update if not showing a specific worker message
            if (!this.els.workerInfo.textContent.startsWith('[Worker')) {
                this.els.workerInfo.textContent = msg;
            }
        }
    }
};

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TracerView.init());
} else {
    TracerView.init();
}
