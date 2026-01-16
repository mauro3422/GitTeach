/**
 * DeepCurator - Deep Curation Engine (Map-Reduce) and AI Insights
 * REFACTORED: Delegates to specialized modules (SRP compliant)
 * 
 * SOLID Principles:
 * - S: Only orchestrates curation pipeline and coordinates modules
 * - O: Extensible via module composition
 * - L: N/A (no inheritance)
 * - I: Minimal interface (5 public methods)
 * - D: Depends on injected coordinator
 * 
 * Extracted Modules:
 * - ThematicMapper: Parallel AI analysis layers (architecture, habits, stack)
 * - InsightsCurator: Funnel of Truth (dedup, filter, weighting)
 * - DNASynthesizer: Technical DNA synthesis with JSON schema
 */
import { AIService } from './aiService.js';
import { Logger } from '../utils/logger.js';
import { DebugLogger } from '../utils/debugLogger.js';
import { ThematicMapper } from './curator/ThematicMapper.js';
import { InsightsCurator } from './curator/InsightsCurator.js';
import { DNASynthesizer } from './curator/DNASynthesizer.js';
import { MetricRefinery } from './curator/MetricRefinery.js';
import { RepoBlueprintSynthesizer } from './curator/RepoBlueprintSynthesizer.js';
import { HolisticSynthesizer } from './curator/HolisticSynthesizer.js';
import { AISlotPriorities } from './ai/AISlotManager.js';
import { CacheRepository } from '../utils/cacheRepository.js';

export class DeepCurator {
    constructor(debugLogger = null) {
        this.debugLogger = debugLogger || DebugLogger;

        // Delegate to specialized modules
        this.thematicMapper = new ThematicMapper();
        this.insightsCurator = new InsightsCurator();
        this.dnaSynthesizer = new DNASynthesizer();
        this.dnaSynthesizer = new DNASynthesizer();
        this.blueprintSynthesizer = new RepoBlueprintSynthesizer();
        this.holisticSynthesizer = new HolisticSynthesizer();

        // Internal state for streaming accumulation
        this.accumulatedFindings = [];
        this.traceabilityMap = {};
    }

    // =========================================
    // PUBLIC API (Contract - DO NOT BREAK)
    // =========================================

    /**
     * Incrementally processes a batch of findings
     * Used in Streaming Map-Reduce pipeline (Slot 5)
     */
    incorporateBatch(batchFindings) {
        if (!batchFindings || batchFindings.length === 0) return null;

        this.accumulatedFindings.push(...batchFindings);

        // Update traceability map on the fly
        batchFindings.forEach(finding => {
            const domain = finding.classification || 'General';
            if (!this.traceabilityMap[domain]) {
                this.traceabilityMap[domain] = [];
            }
            this.traceabilityMap[domain].push({
                uid: finding.uid || null,
                repo: finding.repo,
                file: finding.path,
                summary: finding.summary
            });
        });

        // Return current state snapshot
        return {
            totalFindings: this.accumulatedFindings.length,
            domains: Object.keys(this.traceabilityMap)
        };
    }

    /**
     * Deep Curation Engine (Map-Reduce):
     * Takes 100% of summaries and reduces them to dense memory.
     * Uses "Funnel of Truth" logic (Deduplication + Rarity Filter).
     */
    async runDeepCurator(username, coordinator) {
        // Step 1: Get Raw Rich Data
        // PREFER internal accumulation (which has UIDs from MemoryManager) over Coordinator (which might be raw)
        const rawFindings = this.accumulatedFindings.length > 0
            ? this.accumulatedFindings
            : coordinator.getAllRichSummaries();

        if (!rawFindings || rawFindings.length === 0) {
            Logger.info('DeepCurator', 'No findings available for curation.');
            return null;
        }

        // Step 2: Curate (Deduplicate + Filter + Weighting + Referencing)
        const curationResult = this.curateInsights(rawFindings);
        const { validInsights, anomalies, stats, traceability_map } = curationResult;

        Logger.reducer(`Curation completed: ${rawFindings.length} -> ${validInsights.length} unique insights.`);
        Logger.reducer(`Diversity: ${stats.repoCount} repositories, ${stats.topStrengths.slice(0, 3).map(s => s.name).join(', ')} predominant.`);

        if (anomalies.length > 0) {
            Logger.warn('DeepCurator', `Detected ${anomalies.length} integrity anomalies.`);
        }





        // Step 3: Format insights for AI consumption
        const validInsightsText = this.insightsCurator.formatInsightsAsText(validInsights);

        // EXTRA STEP: Mathematical Metric Refining (Objectivity Layer)
        // This grounds the AI in reality before mapping layers
        const healthReport = MetricRefinery.refine(validInsights, coordinator.getTotalFilesScanned?.() || 0);

        // Step 4: Execute Thematic Mapping (Phase 1)
        Logger.mapper('Executing 3 layers of deep technical analysis...');
        // NEW: Pass healthReport to mapper so it can be used in prompts
        const mapperResults = await this.thematicMapper.executeMapping(username, validInsightsText, healthReport);
        const thematicAnalyses = this.thematicMapper.formatForSynthesis(mapperResults);

        // EXTRA STEP: Repository Blueprints (Repo-Centric Intelligence)
        // Group findings by repo and generate individual projections
        // NOW with INCREMENTAL UPDATES: We pass the global context so we can refine identity on the fly.
        const newBlueprints = await this._generateRepoBlueprints(username, rawFindings, {
            thematicAnalyses,
            stats,
            traceability_map,
            rawCount: rawFindings.length,
            curatedCount: validInsights.length,
            healthReport
        });

        // EXTRA STEP: Holistic Synthesis (Meta-Layer)
        // 1. Fetch History
        const historicalBlueprints = await CacheRepository.getAllRepoBlueprints() || [];

        // 2. Merge (New overrides Old)
        const blueprintMap = new Map();
        [...historicalBlueprints, ...newBlueprints].forEach(bp => {
            if (bp && bp.repoName) {
                blueprintMap.set(bp.repoName, bp);
            }
        });
        const combinedBlueprints = Array.from(blueprintMap.values());

        // 3. Calculate Global Metrics (Versatility, Consistency, Evolution)
        const holisticMetrics = this.holisticSynthesizer.synthesize(combinedBlueprints);
        Logger.reducer(`Holistic Metrics: Versatility=${holisticMetrics.versatility_index}, Evolution=${holisticMetrics.evolution_rate}`);

        // Final consolidation (just to be sure everything is synced)
        await this._refineGlobalIdentity(username, {
            thematicAnalyses, stats, traceability_map,
            rawCount: rawFindings.length, curatedCount: validInsights.length, healthReport
        });

        // Debug logging
        DebugLogger.logCurator('mapper_results', {
            architecture: thematicAnalyses[0],
            habits: thematicAnalyses[1],
            stack: thematicAnalyses[2],
            originalCount: rawFindings.length,
            curatedCount: validInsights.length,
            anomalies: anomalies,
            stats: stats,
            healthReport: healthReport // Log the math report
        });

        // Step 5: Synthesize DNA (Phase 2 - Reduce)
        const { dna, traceability_map: finalMap } = await this.dnaSynthesizer.synthesize(
            username,
            thematicAnalyses,
            stats,
            traceability_map,
            rawFindings.length,
            validInsights.length,
            traceability_map,
            rawFindings.length,
            validInsights.length,
            healthReport, // NEW: Pass healthReport for deterministic scoring
            holisticMetrics // NEW: Pass Holistic Metrics for global narrative
        );

        // Debug logging
        DebugLogger.logCurator('final_dna_synthesis', dna);

        return { dna, traceability_map: finalMap };
    }

    /**
     * Curate insights using the Funnel of Truth
     * (Delegating to InsightsCurator)
     */
    curateInsights(findings) {
        return this.insightsCurator.curate(findings);
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
            const structuredFindings = codeInsights.map(f => {
                const files = f.auditedSnippets && f.auditedSnippets !== "No Access"
                    ? f.auditedSnippets.map(s => `- ${s.file}: ${s.aiSummary || "Analyzed"}`).join('\n')
                    : "Files analyzed without specific summary.";
                return `### REPO: ${f.repo}\n${files}`;
            }).join('\n\n');

            prompt = `You are an ELITE TECHNICAL CURATOR. Your goal is to transform Worker-analyzed code into an IMPACT PROFILE for ${username}.
            
            RAW DATA BY REPOSITORY (STRICTLY TRUTHFUL):
            ${structuredFindings}
            
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
     * Internal: Generates and persists a "Technical Projection" for each repo
     * @private
     * @returns {Promise<Array>} List of generated blueprints
     */
    async _generateRepoBlueprints(username, allFindings, globalContext = null) {
        Logger.info('DeepCurator', 'Synthesizing individual Repository Blueprints...');

        const reposMap = new Map();
        allFindings.forEach(f => {
            if (!reposMap.has(f.repo)) reposMap.set(f.repo, []);
            reposMap.get(f.repo).push(f);
        });

        const generatedBlueprints = [];

        const blueprintPromises = Array.from(reposMap.entries()).map(async ([repoName, findings]) => {
            // 1. Curate findings for THIS repo (local deduplication)
            const curation = this.insightsCurator.curate(findings);

            // 2. Synthesize Blueprint
            const blueprint = await this.blueprintSynthesizer.synthesize(repoName, curation.validInsights);

            // 3. Persist
            if (blueprint) {
                generatedBlueprints.push(blueprint);
                Logger.reducer(`[${repoName}] Blueprint generated. Complexity: ${blueprint.metrics.complexity}`);
                await CacheRepository.persistRepoBlueprint(repoName, blueprint);

                // STREAMING HOOK: Update Global Identity immediately!
                if (globalContext) {
                    await this._refineGlobalIdentity(username, globalContext);
                }
            }
        });

        await Promise.all(blueprintPromises);
        return generatedBlueprints;
    }

    /**
     * Internal: Re-calculates and persists the Global Identity based on current blueprints
     * @private
     */
    async _refineGlobalIdentity(username, ctx) {
        try {
            // 1. Fetch History + New State
            const allBlueprints = await CacheRepository.getAllRepoBlueprints() || [];
            if (allBlueprints.length === 0) return;

            // 2. Calculate Holistic Metrics
            const holisticMetrics = this.holisticSynthesizer.synthesize(allBlueprints);

            // 3. Synthesize Updated Global DNA
            const { dna } = await this.dnaSynthesizer.synthesize(
                username,
                ctx.thematicAnalyses,
                ctx.stats,
                ctx.traceability_map,
                ctx.rawCount,
                ctx.curatedCount,
                ctx.healthReport,
                holisticMetrics
            );

            // 4. Persist immediately (Streaming Update)
            if (dna) {
                await CacheRepository.setTechnicalIdentity(username, dna);
                Logger.reducer(`[STREAMING] Global Identity updated. Versatility: ${holisticMetrics.versatility_index} | Blueprints: ${allBlueprints.length}`);
            }
        } catch (e) {
            Logger.error('DeepCurator', `Streaming update failed: ${e.message}`);
        }
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
            const curation = this.insightsCurator.curate(repoFindings);
            const blueprint = await this.blueprintSynthesizer.synthesize(repoName, curation.validInsights);

            if (blueprint) {
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
                    const ctx = this._buildStreamingContext();
                    await this._refineGlobalIdentity(username, ctx);
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
     * Helper to build a partial context for streaming updates
     */
    _buildStreamingContext() {
        const rawFindings = this.accumulatedFindings;
        const curationResult = this.curateInsights(rawFindings);

        // Use placeholder thematic analysis for speed (Wait for Phase 2 for deep analysis)
        const thematicAnalyses = [
            "Analysis in progress (Streaming)...",
            "Analysis in progress (Streaming)...",
            "Analysis in progress (Streaming)..."
        ];

        // Light-weight health report
        const healthReport = MetricRefinery.refine(curationResult.validInsights, 0); // Total files unknown in streaming

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
