/**
 * RepoBlueprintSynthesizer - Synthesizes a technical projection for a single repository
 * 
 * Responsibilities:
 * - Aggregate metrics for a specific repo (SOLID, Complexity, etc).
 * - Generate a dense technical summary of the repo's purpose and architecture.
 * - Create a "Blueprint" object for persistence.
 */
import { MetricRefinery } from './MetricRefinery.js';
import { AIService } from '../aiService.js';
import { AISlotPriorities } from '../ai/AISlotManager.js';

export class RepoBlueprintSynthesizer {
    /**
     * Synthesize a blueprint for a repository
     * @param {string} repoName - Name of the repo
     * @param {Array} findings - Curated findings for this repo
     * @returns {Promise<Object>} The Repository Blueprint
     */
    async synthesize(repoName, findings) {
        if (!findings || findings.length === 0) return null;

        // 1. Calculate Repo-Specific Metrics (Dual-Track)
        const healthReport = MetricRefinery.refine(findings, findings.length);

        // 2. Build Thematic Summary via AI with CoT
        const result = await this._generateThematicSummary(repoName, findings, healthReport);

        // 3. Assemble Blueprint
        return {
            repoName,
            timestamp: new Date().toISOString(),
            metrics: {
                logic: healthReport.logic_health,
                knowledge: healthReport.knowledge_health,
                signals: healthReport.seniority_signals
            },
            volume: healthReport.volume,
            domains: healthReport.domains,
            thought: result.thought,
            summary: result.summary,
            blueprintVersion: "1.2"
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
Focus on: Primary purpose, Architectural pattern, and Tech Stack.

STRICT PROTOCOL:
1. THINK: Analyze the findings to identify the core architectural intent.
2. SYNTHESIZE: Generate a dense 3-sentence summary.

JSON SCHEMA:
{
  "thought": "Internal reasoning about the repo's architecture and quality",
  "summary": "Dense 3-sentence technical projection"
}`;

        const userPrompt = `REPO: ${repoName}
METRICS (Dual-Track):
- Logic: SOLID=${health.logic_health.solid}, Modularity=${health.logic_health.modularity}
- Knowledge: Clarity=${health.knowledge_health.clarity}, Discipline=${health.knowledge_health.discipline}
- Signals: Semantic=${health.seniority_signals.semantic}, Resilience=${health.seniority_signals.resilience}

KEY FINDINGS:
${context}

GENERATE BLUEPRINT JSON:`;

        try {
            const response = await AIService.callAI(systemPrompt, userPrompt, 0.1, 'json_object', null, AISlotPriorities.BACKGROUND);
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
