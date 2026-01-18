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
 */
import { AIService } from './aiService.js';
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { MetricRefinery } from './curator/MetricRefinery.js';
import { StreamingHandler } from './curator/StreamingHandler.js';
import { GlobalIdentityUpdater } from './curator/GlobalIdentityUpdater.js';
import { SynthesisOrchestrator } from './curator/SynthesisOrchestrator.js';
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

        // Backward compatibility: accumulatedFindings points to streaming handler
        this.accumulatedFindings = this.streamingHandler.getAccumulatedFindings();
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
        let prompt = "";

        const isRateLimited = codeInsights && codeInsights.some(f => f.error === "Rate Limit");

        if (isRateLimited) {
            prompt = `IMPORTANT NOTICE! The system has reached GitHub's Rate Limit.
            Explain honestly to the user that Workers have been temporarily blocked by GitHub.
            Tell them you cannot analyze real code at this moment to avoid hallucinations.
            Suggest waiting a few minutes or using a Personal Access Token if available.
            Generate a JSON with this format:
            { "summary": "GitHub API rate limit temporarily reached.", "suggestions": ["github_stats"] }`;
        } else if (!hasRealData) {
            prompt = `ATTENTION! I couldn't access the real code from ${username}'s repositories (Connection or permission errors).
            Honestly tell the user that you analyzed their repository and language list (${langs.join(', ')}), 
            but couldn't "dive" into their code for a deep audit. 
            Ask if they have the GitHub token configured correctly.
            Generate a JSON with this format:
            { "summary": "Couldn't analyze your code deeply due to lack of access.", "suggestions": ["github_stats"] }`;
        } else {
            // OPTIMIZATION: Use TaskDivider to batch or summarize findings if too many
            const maxVisibleRepos = 10;
            const topInsights = codeInsights.slice(0, maxVisibleRepos);
            const remainingCount = codeInsights.length - maxVisibleRepos;

            const structuredFindings = topInsights.map(f => {
                const files = f.auditedSnippets && f.auditedSnippets !== "No Access"
                    ? f.auditedSnippets.slice(0, 5).map(s => `- ${s.file}: ${s.aiSummary || "Analyzed"}`).join('\n')
                    : "Files analyzed without specific summary.";
                return `### REPO: ${f.repo}\n${files}`;
            }).join('\n\n');

            const additionalContext = remainingCount > 0
                ? `\n\n[NOTE] ${remainingCount} additional repositories were analyzed but omitted for context efficiency.`
                : "";

            prompt = `${SynthesisPrompts.CURATOR_IDENTITY_PROMPT}
            
            USER: ${username}
            RAW DATA BY REPOSITORY (STRICTLY TRUTHFUL):
            ${structuredFindings}
            ${additionalContext}`;
        }

        try {
            const response = await AIService.callAI("You are an expert GitHub profile analyst.", prompt, 0.3);

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn("[getAIInsights] No JSON found, using response as summary.");
                return {
                    summary: response.substring(0, 500),
                    suggestions: ['github_stats']
                };
            }

            const cleanJson = jsonMatch[0];
            const data = JSON.parse(cleanJson);

            const summary = data.summary || data.bio || "Profile analyzed.";
            const suggestions = data.suggestions || ['github_stats', 'skills_grid'];

            return { summary, suggestions };
        } catch (e) {
            console.warn("AI Insight Fallback Error:", e);
            return {
                summary: `Developer focused on ${langs[0] || 'software'}.`,
                suggestions: ['github_stats', 'top_langs']
            };
        }
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
        // Delegate to the specialized PromptBuilder logic even if used in isolation
        const { WorkerPromptBuilder } = await import('./workers/WorkerPromptBuilder.js');
        const builder = new WorkerPromptBuilder();
        const systemPrompt = builder.buildSystemPrompt();
        const { prompt: userPrompt } = builder.buildUserPrompt({ repo, path, content: usageSnippet });

        try {
            return await AIService.callAI(systemPrompt, userPrompt, 0.1, null, null, priority);
        } catch (e) {
            return `Analysis failed: ${e.message}`;
        }
    }

    async _buildStreamingContext() {
        return await this.streamingHandler._buildStreamingContext();
    }
}
