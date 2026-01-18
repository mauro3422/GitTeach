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
import { StreamingRepoProcessor } from './curator/StreamingRepoProcessor.js';
import { BlueprintGenerator } from './curator/BlueprintGenerator.js';
import { GlobalIdentityRefiner } from './curator/GlobalIdentityRefiner.js';
import { TaskDivider } from './TaskDivider.js';
import { AISlotPriorities } from './ai/AISlotManager.js';

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

            prompt = `You are an ELITE TECHNICAL CURATOR. Your goal is to transform Worker-analyzed code into an IMPACT PROFILE for ${username}.
            
            RAW DATA BY REPOSITORY (STRICTLY TRUTHFUL):
            ${structuredFindings}
            ${additionalContext}
            
            CURATION INSTRUCTIONS:
            1. **TECHNICAL IDENTITY**: Based on all repositories, define the developer's essence.
            2. **FORENSIC EVIDENCE (CRITICAL)**: DON'T use empty phrases. If you say they know Python, cite the file where you saw it.
            3. **DETECT REAL PROJECTS**: Separate school assignments from real Game Engines or libraries.

            FORMAT RULES (JSON ONLY):
            {
              "bio": "3-4 sentence narrative summary highlighting unique strengths.",
              "traits": [
                { "name": "Architecture", "score": 0-100, "details": "Brief detail of detected pattern" },
                { "name": "Habits", "score": 0-100, "details": "Brief detail on quality/naming" },
                { "name": "Technology", "score": 0-100, "details": "Brief detail on stack/performance" }
              ],
              "key_evidences": [
                 { "file": "path/to/file", "snippet": "Brief code fragment", "insight": "Why this demonstrates skill" }
              ],
              "verdict": "Senior/Mid/Junior + Specialty"
            }
            
            Always respond based ONLY on mapper data.`;
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

    /**
     * Generates a dense summary of insights to avoid prompt bloating
     * @private
     */
    _generateInsightsSummary(codeInsights) {
        if (!codeInsights || codeInsights.length === 0) return "No data.";

        return codeInsights.map(f => {
            const auditCount = f.auditedSnippets ? (Array.isArray(f.auditedSnippets) ? f.auditedSnippets.length : 0) : 0;
            return `- ${f.repo}: ${auditCount} files audited. Core tech detected.`;
        }).join('\n');
    }

    /**
     * Internal: Generates and persists a "Technical Projection" for each repo
     * @private
     * @returns {Promise<Array>} List of generated blueprints
     */
    async _generateRepoBlueprints(username, allFindings, globalContext = null) {
        // This method is deprecated - now handled by identityUpdater.generateRepoBlueprints
        Logger.info('DeepCurator', 'Using new blueprint generation via identityUpdater...');
        return await this.identityUpdater.generateRepoBlueprints(username, allFindings);
    }

    /**
     * Internal: Re-calculates and persists the Global Identity based on current blueprints
     * @private
     */
    async _refineGlobalIdentity(username, ctx) {
        // This method is deprecated - now handled by identityUpdater.refineGlobalIdentity
        Logger.info('DeepCurator', 'Using new global identity update via identityUpdater...');
        return await this.identityUpdater.refineGlobalIdentity(username, ctx);
    }

    /**
     * STREAMING API: Process a single repo immediately after scanning
     */
    async processStreamingRepo(username, repoName, coordinator, isPartial = false) {
        // 1. Fetch findings (Prefer Coordinator as it has real-time state, bypassing WorkerPool buffer)
        let repoFindings = [];
        if (coordinator) {
            repoFindings = coordinator.getAllRichSummaries().filter(f => f.repo === repoName);
        }

        // Fallback to internal state
        if (repoFindings.length === 0) {
            repoFindings = this.accumulatedFindings.filter(f => f.repo === repoName);
        }

        if (repoFindings.length === 0) {
            Logger.warn('DeepCurator', `[STREAMING] Skipped ${repoName} (No findings available yet)`);
            return;
        }

        Logger.info('DeepCurator', `[STREAMING] Processing finished repo: ${repoName} (${repoFindings.length} findings)`);

        try {
            // 2. Curate & Synthesize Blueprint (Local)
            const curation = this.identityUpdater.curateFindings(repoFindings);
            // Use repoFindings (raw) for metrics but curation.validInsights is for thematic summary inside synthesize
            const blueprint = await this.identityUpdater.synthesizeBlueprint(repoName, curation.validInsights, repoFindings);

            if (blueprint) {
                this.streamingHandler.incrementTick('blueprints'); // Tick: Blueprint
                Logger.reducer(`[${repoName}] Blueprint generated (Streaming). Complexity: ${blueprint.metrics.complexity}`);
                await CacheRepository.persistRepoBlueprint(repoName, blueprint);

                // GATEKEEPER IMPLEMENTATION (Optimization)
                // Only refine Global Identity if "Critical Mass" is reached
                // Rule: At least 2 repos with > 2 analyzed files
                const allBlueprints = await CacheRepository.getAllRepoBlueprints();
                const decentRepos = allBlueprints.filter(bp => bp.volume && bp.volume.analyzedFiles > 2).length;

                if (decentRepos < 2) {
                    Logger.info('DeepCurator', `[STREAMING] Global Synthesis Skipped (Gatekeeper: ${decentRepos}/2 decent repos)`);
                } else {
                    // 3. Update Global Identity (Incremental)
                    const ctx = await this._buildStreamingContext();
                    await this._refineGlobalIdentity(username, ctx);
                    this.streamingHandler.incrementTick('global_refinements'); // Tick: Refinement
                }
            }
        } catch (e) {
            Logger.error('DeepCurator', `Streaming process failed for ${repoName}: ${e.message}`);
        }
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

    /**
     * Helper to build a REAL context for streaming updates using cached blueprints
     * NO MORE PLACEHOLDERS - uses actual thematic analysis from completed repos
     */
    async _buildStreamingContext() {
        const rawFindings = this.streamingHandler.getAccumulatedFindings();
        const curationResult = this.synthesisOrchestrator.curateInsights(rawFindings, this.streamingHandler);

        // REAL DATA: Get all blueprints with their thematic analyses
        let thematicAnalyses = [];
        try {
            const allBlueprints = await CacheRepository.getAllRepoBlueprints();
            thematicAnalyses = allBlueprints
                .filter(bp => bp.thematicAnalysis)
                .map(bp => ({
                    repo: bp.repoName,
                    architecture: bp.thematicAnalysis.architecture?.analysis || null,
                    habits: bp.thematicAnalysis.habits?.analysis || null,
                    stack: bp.thematicAnalysis.stack?.analysis || null
                }));

            Logger.info('DeepCurator', `Built streaming context with ${thematicAnalyses.length} repos' real thematic data`);
        } catch (e) {
            Logger.warn('DeepCurator', `Could not load blueprints for context: ${e.message}`);
        }

        // Light-weight health report (Use rawFindings for Churn meta)
        const healthReport = MetricRefinery.refine(rawFindings, 0);

        return {
            thematicAnalyses,
            stats: curationResult.stats,
            traceability_map: curationResult.traceability_map,
            rawCount: rawFindings.length,
            curatedCount: curationResult.validInsights.length,
            healthReport
        };
    }
}
