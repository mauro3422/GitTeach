/**
 * DeepCurator - Lightweight facade for deep curation pipeline
 * REFACTORED: Delegates to specialized modules (SRP compliant)
 *
 * SOLID Principles:
 * - S: Only orchestrates curation pipeline and coordinates modules
 * - O: Extensible via module composition
 * - L: N/A (no inheritance)
 * - I: Minimal interface (5 public methods)
 * - D: Depends on injected coordinator
 *
 * Composed Modules:
 * - StreamingHandler: Real-time processing and batch accumulation
 * - GlobalIdentityUpdater: Identity persistence and blueprint generation
 * - SynthesisOrchestrator: Main curation pipeline coordination
 * - InsightGenerator: AI-powered insights and summaries
 */
import { AIService } from './aiService.js';
import { rendererLogger } from '../utils/RendererLogger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { MetricRefinery } from './curator/MetricRefinery.js';
import { StreamingHandler } from './curator/StreamingHandler.js';
import { GlobalIdentityUpdater } from './curator/GlobalIdentityUpdater.js';
import { SynthesisOrchestrator } from './curator/SynthesisOrchestrator.js';
import { InsightGenerator } from './curator/InsightGenerator.js';
import { TaskDivider } from './TaskDivider.js';
import { AISlotPriorities } from './ai/AISlotManager.js';
import { SynthesisPrompts } from '../prompts/curator/SynthesisPrompts.js';

export class DeepCurator {
    constructor(debugLogger = null) {
        this.debugLogger = debugLogger;

        // Compose specialized modules
        this.streamingHandler = new StreamingHandler();
        this.identityUpdater = new GlobalIdentityUpdater(debugLogger);
        this.synthesisOrchestrator = new SynthesisOrchestrator();
        this.insightGenerator = new InsightGenerator();

        // Backward compatibility: accumulatedFindings points to streaming handler
    }

    get accumulatedFindings() {
        return this.streamingHandler.getAccumulatedFindings();
    }

    // =========================================
    // =========================================
    // PUBLIC API (Contract - DO NOT BREAK)
    // =========================================

    /**
     * Incrementally processes a batch of findings
     * Used in Streaming Map-Reduce pipeline (Slot 5)
     */
    incorporateBatch(batchFindings) {
        if (!batchFindings || batchFindings.length === 0) return null;

        const result = this.streamingHandler.incorporateBatch(batchFindings);

        // SYNC TRACEABILITY MAP (Forensic Audit Fix)
        // Ensure that we capture the traceability data immediately for local usage
        // even if StreamingHandler stores the raw data.

        batchFindings.forEach(finding => {
            // Normalize for downstream consumers
            finding.file = finding.file || finding.path || 'unknown';
            if (!finding.uid && finding.params?.uid) finding.uid = finding.params.uid;
        });

        return result;
    }

    /**
     * Deep Curation Engine (Map-Reduce):
     * Takes 100% of summaries and reduces them to dense memory.
     * Uses "Funnel of Truth" logic (Deduplication + Rarity Filter).
     */
    async runDeepCurator(username, coordinator) {
        // Generate repository blueprints first
        const rawFindings = this.streamingHandler.getAccumulatedFindings();
        const allFindings = rawFindings.length > 0 ? rawFindings : coordinator.getAllRichSummaries();

        if (allFindings.length > 0) {
            await this.identityUpdater.generateRepoBlueprints(username, allFindings);
        }

        // Delegate main synthesis to orchestrator
        const result = await this.synthesisOrchestrator.runDeepCurator(username, coordinator, this.streamingHandler);

        return result;
    }

    /**
     * Curate insights using the Funnel of Truth
     * (Delegating to SynthesisOrchestrator)
     */
    curateInsights(findings) {
        return this.synthesisOrchestrator.curateInsights(findings);
    }

    /**
     * Generates AI insights based on scan findings
     */
    async getAIInsights(username, langs, codeInsights, hasRealData) {
        return await this.insightGenerator.getAIInsights(username, langs, codeInsights, hasRealData);
    }

    async _refineGlobalIdentity(username, ctx) {
        return await this.identityUpdater.refineGlobalIdentity(username, ctx);
    }

    async processStreamingRepo(username, repoName, coordinator, isPartial = false) {
        // Delegate to StreamingHandler (Now supports all logic V4)
        return await this.streamingHandler.processStreamingRepo(username, repoName, coordinator, isPartial, this.identityUpdater);
    }

    /**
     * Generates a dense technical summary using local AI.
     */
    async generateHighFidelitySummary(repo, path, usageSnippet, priority = AISlotPriorities.BACKGROUND) {
        return await this.insightGenerator.generateHighFidelitySummary(repo, path, usageSnippet, priority);
    }

    async _buildStreamingContext() {
        return await this.streamingHandler._buildStreamingContext();
    }
}
