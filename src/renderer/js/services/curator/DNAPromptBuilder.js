/**
 * DNAPromptBuilder - Specialized builder for DNA synthesis prompts
 * Extracted from DNASynthesizer to comply with SRP
 *
 * Responsibilities:
 * - Build synthesis prompts with cognitive vaccines
 * - Format thematic analyses for AI consumption
 * - Include holistic metrics and health reports
 */
import { Logger } from '../../utils/logger.js';

export class DNAPromptBuilder {
    /**
     * Build the synthesis prompt with all context
     * @param {string} username - GitHub username
     * @param {Array} thematicAnalyses - Results from ThematicMapper
     * @param {Object} stats - Statistics from InsightsCurator
     * @param {number} rawCount - Total raw findings count
     * @param {number} curatedCount - Curated insights count
     * @param {Object} holisticMetrics - Holistic metrics from HolisticSynthesizer
     * @param {Object} healthReport - Health report from MetricRefinery
     * @returns {string} Full synthesis prompt
     */
    buildSynthesisPrompt(username, thematicAnalyses, stats, rawCount, curatedCount, holisticMetrics = null, healthReport = null) {
        // LFM2 Standard: XML Fencing for clear context separation
        return `
<system_role>
You are the SENIOR TECHNICAL PROFILER.
Your goal is to synthesize the TECHNICAL DNA of the user based on multi-repository forensics.
</system_role>

<context>
USERNAME: ${username}
RAW_DATA_VOLUME: ${rawCount} findings reduced to ${curatedCount} insights.
REPOSITORIES_ANALYZED: ${stats.repoCount}
TOP_STRENGTHS: ${stats.topStrengths.map(s => `${s.name} (${s.count})`).join(', ')}

[SPECIALIST_REPORTS]
<architecture>
${thematicAnalyses[0]}
</architecture>

<habits>
${thematicAnalyses[1]}
</habits>

<stack_tech>
${thematicAnalyses[2]}
</stack_tech>
[/SPECIALIST_REPORTS]

[HOLISTIC_METRICS]
// These are deterministic math-calculated global scores.
VERSATILITY_INDEX: ${holisticMetrics ? holisticMetrics.versatility_index : 'N/A'} (0-100)
- Definition: Variance in architecture/stack across repos. High = Full-Range Developer.
CONSISTENCY_SCORE: ${holisticMetrics ? holisticMetrics.consistency_score : 'N/A'} (0-100)
- Definition: Discipline stability. High = Professional Reliability.
EVOLUTION_RATE: ${holisticMetrics ? holisticMetrics.evolution_rate : 'N/A'}
- Definition: Quality trajectory over time.
[/HOLISTIC_METRICS]

[EXTENDED_METRICS]
${healthReport && healthReport.extended_metadata ? `
SOCIAL_COLLAB: ${healthReport.extended_metadata.dimensions.social} (0-5)
SECURITY_POSTURE: ${healthReport.extended_metadata.dimensions.security} (0-5)
TESTING_MATURITY: ${healthReport.extended_metadata.dimensions.testability} (0-5)
TOP_CONTEXTS: ${healthReport.extended_metadata.semantic.top_contexts.join(', ')}
TOP_FRAMEWORKS: ${healthReport.extended_metadata.semantic.top_frameworks.join(', ')}
STACK_MATURITY: ${healthReport.extended_metadata.semantic.dominant_maturity}

[PROFESSIONAL_SUMMARY]
CODE_QUALITY: Cyclomatic=${healthReport.extended_metadata.professional.quality.cyclomatic}, Debt=${healthReport.extended_metadata.professional.quality.debt_ratio}, Maintainability=${healthReport.extended_metadata.professional.quality.maintainability}
ECOSYSTEM: Tools=${healthReport.extended_metadata.professional.ecosystem.top_tools.join(', ')}, Strategy=${healthReport.extended_metadata.professional.ecosystem.dominant_strategy}
COLLABORATION: Participation=${healthReport.extended_metadata.professional.collaboration.review_participation}, Mentoring=${healthReport.extended_metadata.professional.collaboration.mentoring_culture}
GROWTH: Vibe=${healthReport.extended_metadata.professional.growth.dominant_vibe}, Skills=${healthReport.extended_metadata.professional.growth.skill_signals.join(', ')}
CHURN: AvgAge=${healthReport.extended_metadata.professional.churn.avg_age_days} days, Authors=${healthReport.extended_metadata.professional.churn.unique_authors}
[/PROFESSIONAL_SUMMARY]

[RESILIENCE_SUMMARY]
ERROR_DISCIPLINE: ${healthReport.extended_metadata.resilience_report?.error_discipline_score || "N/A"} (0-5)
DEFENSIVE_POSTURE: ${healthReport.extended_metadata.resilience_report?.defensive_posture_score || "N/A"} (0-5)
OPTIMIZATION: ${healthReport.extended_metadata.resilience_report?.optimization_score || "N/A"} (0-5)
ANTI_PATTERNS: ${healthReport.extended_metadata.resilience_report?.common_antipatterns.join(', ') || "None Detected"}
[/RESILIENCE_SUMMARY]
` : 'N/A'}
[/EXTENDED_METRICS]
</context>

<task>
Synthesize the 'Technical DNA' JSON object using the DUAL-TRACK PROTOCOL.
1. **Logic health**: Engineering rigor (SOLID, Modularity).
2. **Knowledge health**: Architectural eloquence (Clarity, Discipline).
3. **Seniority Signals**: Professional maturity (Resilience, Auditability).
</task>

<constraints>
1. **Fact-Based**: Do not hallucinate skills not present in the reports.
2. **Holistic Integration**: You MUST mention the Versatility and Evolution in the 'bio'.
3. **Chain-of-Thought**: You MUST generate a 'thought' field FIRST, explaining your reasoning.
4. **Distinctions**: Award badges based on Seniority Signals.
5. **Tech Radar**: Categorize detected frameworks into Adopt/Trial/Assess/Hold based on STACK_MATURITY and TOP_FRAMEWORKS.
6. **Professional Context**: Summarize the 'quality_index', 'ecosystem_profile', 'collaboration_style', 'seniority_vibe' and 'code_churn' based on the PROFESSIONAL_SUMMARY. Use the CHURN data for the 'code_churn' field.
7. **Resilience Forensics**: If ANTI_PATTERNS are detected, you MUST mention them in the 'bio' or 'traits' to provide constructive feedback. Use ERROR_DISCIPLINE to gauge true seniority.
</constraints>

<output_format>
JSON Object only. Starts with '{'.
</output_format>
`;
    }

    /**
     * Build the holistic metrics section
     * @private
     */
    buildHolisticMetricsSection(holisticMetrics) {
        if (!holisticMetrics) return '';

        return `
[HOLISTIC_METRICS]
// These are deterministic math-calculated global scores.
VERSATILITY_INDEX: ${holisticMetrics.versatility_index} (0-100)
- Definition: Variance in architecture/stack across repos. High = Full-Range Developer.
CONSISTENCY_SCORE: ${holisticMetrics.consistency_score} (0-100)
- Definition: Discipline stability. High = Professional Reliability.
EVOLUTION_RATE: ${holisticMetrics.evolution_rate}
- Definition: Quality trajectory over time.
[/HOLISTIC_METRICS]`;
    }

    /**
     * Build the extended metrics section
     * @private
     */
    buildExtendedMetricsSection(healthReport) {
        if (!healthReport || !healthReport.extended_metadata) return '';

        return `
[EXTENDED_METRICS]
SOCIAL_COLLAB: ${healthReport.extended_metadata.dimensions.social} (0-5)
SECURITY_POSTURE: ${healthReport.extended_metadata.dimensions.security} (0-5)
TESTING_MATURITY: ${healthReport.extended_metadata.dimensions.testability} (0-5)
TOP_CONTEXTS: ${healthReport.extended_metadata.semantic.top_contexts.join(', ')}
TOP_FRAMEWORKS: ${healthReport.extended_metadata.semantic.top_frameworks.join(', ')}
STACK_MATURITY: ${healthReport.extended_metadata.semantic.dominant_maturity}
[/EXTENDED_METRICS]`;
    }

    /**
     * Build scoring instruction for deterministic scoring
     * @param {Object} healthReport - Health report with metrics
     * @returns {string} Scoring instruction
     */
    buildScoringInstruction(healthReport) {
        if (!healthReport) return "";

        return `
### MANDATORY METRICS (High-Resolution):
LOGIC HEALTH: SOLID=${healthReport.logic_health.solid}, Modularity=${healthReport.logic_health.modularity}
KNOWLEDGE HEALTH: Clarity=${healthReport.knowledge_health.clarity}, Discipline=${healthReport.knowledge_health.discipline}
SENIORITY SIGNALS (0-5):
  - Semantic: ${healthReport.seniority_signals.semantic}
  - Resilience: ${healthReport.seniority_signals.resilience}
  - Resource Mindfulness: ${healthReport.seniority_signals.resources}
  - Auditability: ${healthReport.seniority_signals.auditability}
  - Domain Fidelity: ${healthReport.seniority_signals.domain_fidelity}

RULE: Use these averages to determine the 'score' in traits.
Score = (LOGIC_AVG * 20) or (KNOWLEDGE_AVG * 20).`;
    }
}
