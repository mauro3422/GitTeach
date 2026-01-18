/**
 * ProfileAnalyzer - Orchestrates specialized modules for user analysis (Facade).
 * Refactored to use SOLID composition: AnalysisPipeline, BatchProcessor.
 *
 * SOLID Principles:
 * - S: Facade that coordinates analysis components
 * - O: Extensible via module composition
 * - L: N/A
 * - I: Clean public interface
 * - D: Depends on injected modules
 */
import { AIService } from './aiService.js';
import { CoordinatorAgent } from './coordinatorAgent.js';
import { AIWorkerPool } from './aiWorkerPool.js';
import { CodeScanner } from './codeScanner.js';
import { DeepCurator } from './deepCurator.js';
import { IntelligenceSynthesizer } from './intelligenceSynthesizer.js';
import { AnalysisPipeline } from './analyzer/AnalysisPipeline.js';
import { BatchProcessor } from './analyzer/BatchProcessor.js';
import { ContextBuilder } from './analyzer/ContextBuilder.js';

console.log("!!! PROFILE ANALYZER RELOADED - VERSION RESURRECTION !!!");

export class ProfileAnalyzer {
    constructor(debugLogger = null, options = {}) {
        this.debugLogger = debugLogger;
        this.options = options;

        // Core components
        this.coordinator = new CoordinatorAgent();
        this.workerPool = new AIWorkerPool(3, this.coordinator, debugLogger);
        this.codeScanner = new CodeScanner(this.coordinator, this.workerPool);
        this.deepCurator = new DeepCurator();
        this.intelligenceSynthesizer = new IntelligenceSynthesizer(null, debugLogger);

        // Specialized modules
        this.analysisPipeline = new AnalysisPipeline();
        this.batchProcessor = new BatchProcessor(this.deepCurator, this.intelligenceSynthesizer);
    }

    async analyze(username, onStep = null) {
        // Delegate to AnalysisPipeline
        const results = await this.analysisPipeline.analyze(username, this.coordinator, this.codeScanner, this.deepCurator, this.intelligenceSynthesizer, this.options);

        // Set up streaming event handlers (specific to ProfileAnalyzer facade)
        this.coordinator.onRepoComplete = (repoName) => {
            this.deepCurator.processStreamingRepo(username, repoName, this.coordinator);
            if (onStep) onStep({ type: 'StreamingUpdate', message: `⚡ Streaming Blueprint: ${repoName} (Final)` });
        };

        this.coordinator.onRepoBatchReady = (repoName) => {
            this.deepCurator.processStreamingRepo(username, repoName, this.coordinator, true);
            if (onStep) onStep({ type: 'StreamingUpdate', message: `🌊 Partial Update: ${repoName}` });
        };

        // Start worker processing
        this.startWorkerProcessing(onStep, username);

        return results;
    }

    async startWorkerProcessing(onStep, username) {
        // Set up batch processing with BatchProcessor
        this.batchProcessor.setupWorkerListeners(this.workerPool, username, onStep);
        this.batchProcessor.setOnBatchComplete((batch) => {
            if (this.onBatchComplete) this.onBatchComplete(batch);
        });

        // Start the worker queue processing
        this.workerPool.processQueue(AIService).catch(err => console.warn('[AI WORKERS] Error:', err));
    }

    getFreshContext(username, technicalIdentity, cognitiveProfile = null, curationEvidence = null) {
        return ContextBuilder.build(username, this.results, technicalIdentity, cognitiveProfile, curationEvidence, () => this.coordinator.getSummaryForChat());
    }
}
