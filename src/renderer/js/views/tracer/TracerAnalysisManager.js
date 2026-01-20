/**
 * TracerAnalysisManager.js
 * Responsabilidad única: Controlar el ciclo de vida del análisis
 */

import { ProfileAnalyzer } from '../../services/profileAnalyzer.js';
import { AIService } from '../../services/aiService.js';
import { memoryManager } from '../../services/memory/MemoryManager.js';
import { pipelineController } from '../../services/pipeline/PipelineController.js';
import { eventQueueBuffer } from '../../services/pipeline/EventQueueBuffer.js';
import { DebugLogger } from '../../utils/debugLogger.js';
import { RendererLogger } from '../../utils/RendererLogger.js';

export const TracerAnalysisManager = {
    analyzer: null,

    /**
     * Initialize the analysis manager
     */
    init() {
        // Initialization if needed
    },

    /**
     * Step 1: Health Check (Visual Ping)
     */
    async verifyFleet() {
        try {
            if (window.fleetAPI?.verify) {
                await window.fleetAPI.verify();
                return true;
            }
            return false;
        } catch (e) {
            RendererLogger.error('[TracerAnalysisManager] Fleet verification failed:', {
                context: { component: 'TracerAnalysisManager', error: e.message }
            });
            return false;
        }
    },

    /**
     * Start the analysis process
     */
    async startAnalysis(config) {
        try {
            const username = 'mauro3422'; // Default for tracer

            // Check auth via Electron API
            const auth = await window.githubAPI.checkAuth();
            if (!auth) {
                throw new Error('No GitHub authentication found. Please login in the main app first.');
            }

            // Start Forensic Session
            const sessionId = `TRACE_${username}_${Date.now()}`;
            await DebugLogger.startSession(sessionId);

            // Sync Visualizer state
            eventQueueBuffer.clear();
            pipelineController.play();

            // ISOLATION: Switch LevelDB and Mirroring to the session folder
            if (window.cacheAPI && window.cacheAPI.switchSession) {
                await window.cacheAPI.switchSession(sessionId);
            }

            // Initialize Analyzer with real Electron context
            this.analyzer = new ProfileAnalyzer();

            // Set up status callbacks
            const onStep = (step) => {
                if (this.isStopping) return; // Ignore updates while stopping

                if (step.type === 'Progreso') {
                    const stats = this.analyzer.coordinator.getStats();
                    // Delegate to UI renderer
                    if (window.tracerUIRenderer) {
                        window.tracerUIRenderer.updateProgress(stats);
                    }
                } else if (step.type === 'WorkerUpdate') {
                    // Update worker info if element exists
                    const workerInfoEl = document.getElementById('worker-info');
                    if (workerInfoEl) {
                        workerInfoEl.textContent = `[Worker ${step.workerId}] ${step.message}`;
                    }
                    // Also update stats on worker updates
                    const stats = this.analyzer.coordinator.getStats();
                    if (window.tracerUIRenderer) {
                        window.tracerUIRenderer.updateProgress(stats);
                    }
                } else if (step.type === 'StreamingUpdate') {
                    if (window.tracerUIRenderer) {
                        window.tracerUIRenderer.renderLog('INFO', step.message);
                    }
                }
            };

            // SYNC FLEET LIMITS: Inform main process about slot capping
            if (window.fleetAPI?.setLimits) {
                await window.fleetAPI.setLimits({
                    8001: 2, // Hard capped for vectors
                    8002: config.maxRepos > 5 ? 4 : 2 // Dynamic cap for mappers based on load
                });
            }

            // Run analysis with dynamic config
            await this.analyzer.analyze(username, onStep, config);

            const stats = this.analyzer.coordinator.getStats();
            stats.reposAnalyzed = this.analyzer.coordinator.inventory.repos.map(r => r.name);

            await window.cacheAPI.generateSummary(stats);
            await DebugLogger.endSession();
            pipelineController.stop();

            return stats;

        } catch (error) {
            RendererLogger.error('[TracerAnalysisManager] Analysis failed:', {
                context: { component: 'TracerAnalysisManager', error: error.message },
                debugData: { stack: error.stack }
            });
            throw error;
        }
    },

    /**
     * Stop the current analysis
     */
    async stopAnalysis() {
        if (!this.analyzer) return;

        this.isStopping = true;

        try {
            this.analyzer.stop();
            // Wait a bit for workers to exit
            await new Promise(r => setTimeout(r, 1000));
        } finally {
            this.isStopping = false;
            pipelineController.stop();
        }
    },

    /**
     * Check if AI status is available
     */
    async checkAIStatus() {
        try {
            await AIService.callAI("Health check", "Are you online?", 1);
            const aiStatusEl = document.getElementById('ai-status');
            if (aiStatusEl) {
                aiStatusEl.textContent = 'AI: ONLINE';
                aiStatusEl.className = 'status-badge online';
            }
            return true;
        } catch (e) {
            const aiStatusEl = document.getElementById('ai-status');
            if (aiStatusEl) {
                aiStatusEl.textContent = 'AI: OFFLINE';
                aiStatusEl.className = 'status-badge offline';
            }
            return false;
        }
    }
};
