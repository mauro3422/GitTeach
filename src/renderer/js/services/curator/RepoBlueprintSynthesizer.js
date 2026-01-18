import { MetricRefinery } from './MetricRefinery.js';
import { AIService } from '../aiService.js';
import { AISlotPriorities } from '../ai/AISlotManager.js';
import { ThematicMapper } from './ThematicMapper.js';
import { Logger } from '../../utils/logger.js';

export class RepoBlueprintSynthesizer {
    constructor() {
        this.thematicMapper = new ThematicMapper();
    }
    /**
     * Synthesize a blueprint for a repository
     * @param {string} repoName - Name of the repo
     * @param {Array} findings - Curated findings for this repo
     * @returns {Promise<Object>} The Repository Blueprint
     */
    async synthesize(repoName, findings, rawFindings = null) {
        if (!findings || findings.length === 0) return null;

        // 1. Calculate Repo-Specific Metrics (Dual-Track)
        // PREFER rawFindings for metadata (churn) if provided
        const sourceNodes = (rawFindings && rawFindings.length > 0) ? rawFindings : findings;
        const healthReport = MetricRefinery.refine(sourceNodes, sourceNodes.length);

        // 2. Build Thematic Summary via AI with CoT
        const result = await this._generateThematicSummary(repoName, findings, healthReport);

        // 3. NEW: Thematic Mapping (Architecture, Habits, Stack)
        // If enough findings, run specialized mapping
        let thematicAnalysis = null;
        if (findings.length >= 3) {
            try {
                // Try to use Golden Knowledge if available (V4 Optimization)
                let mapperInput = findings;
                if (typeof window !== 'undefined' && window.cacheAPI?.getRepoGoldenKnowledge) {
                    const goldenData = await window.cacheAPI.getRepoGoldenKnowledge(repoName);
                    if (goldenData?.goldenKnowledge) {
                        mapperInput = [{
                            repo: repoName,
                            summary: goldenData.goldenKnowledge,
                            uid: 'golden_curated',
                            metadata: goldenData.metrics || {}
                        }];
                        Logger.mapper(`[${repoName}] Using Golden Knowledge for thematic mapping`);
                    }
                }
                thematicAnalysis = await this.thematicMapper.executeMapping(null, mapperInput, null);
            } catch (e) {
                Logger.warn('RepoBlueprintSynthesizer', `Thematic mapping failed: ${e.message}`);
            }
        }

        // 4. Assemble Blueprint
        return {
            repoName,
            timestamp: new Date().toISOString(),
            metrics: {
                logic: healthReport.logic_health,
                knowledge: healthReport.knowledge_health,
                signals: healthReport.seniority_signals,
                professional: healthReport.extended_metadata?.professional || {},
                resilience: healthReport.extended_metadata?.resilience_report || {}
            },
            volume: healthReport.volume,
            domains: healthReport.domains,
            thought: result.thought,
            summary: result.summary,
            thematicAnalysis, // Inject deep mapping
            blueprintVersion: "1.4" // Version bump
        };
    }

    /**
     * Internal: Use AI to condense repo findings into a technical soul/projection
     * @private
     */
    async _generateThematicSummary(repoName, findings, health) {
        const context = findings
            .sort((a, b) => (b.weight || 1) - (a.weight || 1))
            .slice(0, 10)
            .map(f => `- [${f.path || f.file}]: ${f.params?.insight || f.summary}`)
            .join('\n');

        const systemPrompt = `You are a REPOSITORY ARCHITECT. 
Your goal is to summarize the TECHNICAL SOUL of a specific project.
Focus on: Primary purpose, Architectural pattern, Tech Stack, and Error Resilience.

STRICT PROTOCOL:
1. THINK: Analyze the findings to identify the core architectural intent and defensive patterns.
2. SYNTHESIZE: Generate a dense 3-sentence summary.

JSON SCHEMA:
{
  "thought": "Internal reasoning about the repo's architecture, quality, and resilience",
  "summary": "Dense 3-sentence technical projection"
}`;

        const resilienceScore = health.extended_metadata?.resilience_report?.error_discipline_score || "N/A";

        const userPrompt = `REPO: ${repoName}
METRICS (Dual-Track):
- Logic: SOLID=${health.logic_health.solid}, Modularity=${health.logic_health.modularity}
- Knowledge: Clarity=${health.knowledge_health.clarity}, Discipline=${health.knowledge_health.discipline}
- Signals: Semantic=${health.seniority_signals.semantic}, Resilience=${health.seniority_signals.resilience}
- Forensics: Error Discipline=${resilienceScore}

KEY FINDINGS:
${context}

GENERATE BLUEPRINT JSON:`;

        try {
            // Use CPU server to avoid blocking GPU workers
            const response = await AIService.callAI_CPU(systemPrompt, userPrompt, 0.1, 'json_object', null);
            const data = JSON.parse(response);
            return {
                thought: data.thought || "Analysis of repository patterns.",
                summary: data.summary || `Project focused on ${repoName} patterns.`
            };
        } catch (e) {
            return {
                thought: "Error in synthesis, using fallback.",
                summary: `Project focused on ${repoName} patterns and technical implementation.`
            };
        }
    }
}
