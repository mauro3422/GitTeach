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

export class DeepCurator {
    constructor(debugLogger = null) {
        this.debugLogger = debugLogger || DebugLogger;

        // Delegate to specialized modules
        this.thematicMapper = new ThematicMapper();
        this.insightsCurator = new InsightsCurator();
        this.dnaSynthesizer = new DNASynthesizer();

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

        // Step 4: Execute Thematic Mapping (Phase 1)
        Logger.mapper('Executing 3 layers of deep technical analysis...');
        const mapperResults = await this.thematicMapper.executeMapping(username, validInsightsText);
        const thematicAnalyses = this.thematicMapper.formatForSynthesis(mapperResults);

        // Debug logging
        DebugLogger.logCurator('mapper_results', {
            architecture: thematicAnalyses[0],
            habits: thematicAnalyses[1],
            stack: thematicAnalyses[2],
            originalCount: rawFindings.length,
            curatedCount: validInsights.length,
            anomalies: anomalies,
            stats: stats
        });

        // Step 5: Synthesize DNA (Phase 2 - Reduce)
        const { dna, traceability_map: finalMap } = await this.dnaSynthesizer.synthesize(
            username,
            thematicAnalyses,
            stats,
            traceability_map,
            rawFindings.length,
            validInsights.length
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
     * Generates a dense technical summary using local AI.
     */
    async generateHighFidelitySummary(repo, path, usageSnippet) {
        const systemPrompt = `You analyze code files for developer profiling.

STEP 1: Extract the most important function, class, or variable name from the code.
STEP 2: Based on that evidence, classify the domain.

OUTPUT FORMAT (exactly one line):
[DOMAIN] Brief description | Evidence: <paste_actual_code_fragment>

DOMAIN OPTIONS: UI, Backend, Business, System, Game, Script, Data, Science, DevOps, Config

IMPORTANT:
- The evidence MUST be copied from the actual code shown below.
- STRICT RULE: Do not classify as "Game" unless it mentions game engines (Unity, Godot), sprites, or gameplay loops. 
- Administrative, Medical, or Management code is "Business" or "System", NOT "Game".
- Science or Physics simulations are "Science", NOT "Game".
- If code is empty or under 50 characters, output: SKIP
- Never invent function names. Only cite what exists in the code.`;

        const userPrompt = `File: ${repo}/${path}
\`\`\`
${usageSnippet.substring(0, 1000)}
\`\`\`
Analyze:`;

        try {
            return await AIService.callAI(systemPrompt, userPrompt, 0.1);
        } catch (e) {
            return `Analysis failed: ${e.message}`;
        }
    }
}
