/**
 * SynthesisPrompts - Templates for DNA Synthesis
 * Centralized prompts for the DNASynthesizer
 */

export class SynthesisPrompts {
    /**
     * System role definition
     */
    static get SYSTEM_ROLE() {
        return `<system_role>
You are the SENIOR TECHNICAL PROFILER.
Your goal is to synthesize the TECHNICAL DNA of the user based on multi-repository forensics.
</system_role>`;
    }

    /**
     * Task definition
     */
    static get TASK_DEFINITION() {
        return `<task>
Synthesize the 'Technical DNA' JSON object using the DUAL-TRACK PROTOCOL.
1. **Logic health**: Engineering rigor (SOLID, Modularity).
2. **Knowledge health**: Architectural eloquence (Clarity, Discipline).
3. **Seniority Signals**: Professional maturity (Resilience, Auditability).
</task>`;
    }

    /**
     * Constraints
     */
    static get CONSTRAINTS() {
        return `<constraints>
1. **Fact-Based**: Do not hallucinate skills not present in the reports.
2. **Holistic Integration**: You MUST mention the Versatility and Evolution in the 'bio'.
3. **Chain-of-Thought**: You MUST generate a 'thought' field FIRST, explaining your reasoning.
4. **Distinctions**: Award badges based on Seniority Signals.
5. **Tech Radar**: Categorize detected frameworks into Adopt/Trial/Assess/Hold based on STACK_MATURITY and TOP_FRAMEWORKS.
6. **Professional Context**: Summarize the 'quality_index', 'ecosystem_profile', 'collaboration_style', 'seniority_vibe' and 'code_churn' based on the PROFESSIONAL_SUMMARY. Use the CHURN data for the 'code_churn' field.
7. **Resilience Forensics**: If ANTI_PATTERNS are detected, you MUST mention them in the 'bio' or 'traits' to provide constructive feedback. Use ERROR_DISCIPLINE to gauge true seniority.
</constraints>`;
    }

    /**
     * Output format
     */
    static get OUTPUT_FORMAT() {
        return `<output_format>
JSON Object only. Starts with '{'.
</output_format>`;
    }

    /**
     * Build the context section
     * @param {Object} params 
     * @returns {string} Context xml
     */
    static buildContext(params) {
        return `<context>
USERNAME: ${params.username}
RAW_DATA_VOLUME: ${params.rawCount} findings reduced to ${params.curatedCount} insights.
REPOSITORIES_ANALYZED: ${params.stats.repoCount}
TOP_STRENGTHS: ${params.stats.topStrengths.map(s => `${s.name} (${s.count})`).join(', ')}

[SPECIALIST_REPORTS]
<architecture>
${params.thematicAnalyses[0]?.analysis || params.thematicAnalyses[0] || "N/A"}
</architecture>

<habits>
${params.thematicAnalyses[1]?.analysis || params.thematicAnalyses[1] || "N/A"}
</habits>

<stack_tech>
${params.thematicAnalyses[2]?.analysis || params.thematicAnalyses[2] || "N/A"}
</stack_tech>
[/SPECIALIST_REPORTS]

${this.buildHolisticMetrics(params.holisticMetrics)}

${this.buildExtendedMetrics(params.healthReport)}
</context>`;
    }

    static buildHolisticMetrics(metrics) {
        if (!metrics) return '';

        const inv = metrics.inventory || { technologies: [], languages: [], patterns: [], architectures: [] };
        const formatInv = (arr) => arr.slice(0, 10).map(i => `${i.item} (${i.count})`).join(', ') || 'N/A';

        return `[HOLISTIC_METRICS]
// These are deterministic math-calculated global scores.
VERSATILITY_INDEX: ${metrics.versatility_index} (0-100)
- Definition: Variance in architecture/stack across repos. High = Full-Range Developer.
CONSISTENCY_SCORE: ${metrics.consistency_score} (0-100)
- Definition: Discipline stability. High = Professional Reliability.
EVOLUTION_RATE: ${metrics.evolution_rate}
- Definition: Quality trajectory over time.

[INVENTORY_GROUNDING]
// HARD EVIDENCE: Calculated frequency of use across all projects.
TOP_TECHNOLOGIES: ${formatInv(inv.technologies)}
TOP_LANGUAGES: ${formatInv(inv.languages)}
TOP_PATTERNS: ${formatInv(inv.patterns)}
TOP_ARCHITECTURES: ${formatInv(inv.architectures)}
[/INVENTORY_GROUNDING]
[/HOLISTIC_METRICS]`;
    }

    static buildExtendedMetrics(report) {
        if (!report || !report.extended_metadata) {
            return '[EXTENDED_METRICS]\nN/A\n[/EXTENDED_METRICS]';
        }

        const em = report.extended_metadata;

        // Safety checks
        const sem = em.semantic || { top_contexts: [], top_frameworks: [] };
        const pro = em.professional || {
            quality: {}, ecosystem: { top_tools: [] },
            collaboration: {}, growth: { skill_signals: [] },
            churn: {}
        };
        const dim = em.dimensions || {};
        const res = em.resilience_report || { common_antipatterns: [] };

        return `[EXTENDED_METRICS]
SOCIAL_COLLAB: ${dim.social} (0-5)
SECURITY_POSTURE: ${dim.security} (0-5)
TESTING_MATURITY: ${dim.testability} (0-5)
TOP_CONTEXTS: ${sem.top_contexts.join(', ')}
TOP_FRAMEWORKS: ${sem.top_frameworks.join(', ')}
STACK_MATURITY: ${sem.dominant_maturity}

[PROFESSIONAL_SUMMARY]
CODE_QUALITY: Cyclomatic=${pro.quality.cyclomatic}, Debt=${pro.quality.debt_ratio}, Maintainability=${pro.quality.maintainability}
ECOSYSTEM: Tools=${pro.ecosystem.top_tools.join(', ')}, Strategy=${pro.ecosystem.dominant_strategy}
COLLABORATION: Participation=${pro.collaboration.review_participation}, Mentoring=${pro.collaboration.mentoring_culture}
GROWTH: Vibe=${pro.growth.dominant_vibe}, Skills=${pro.growth.skill_signals.join(', ')}
CHURN: AvgAge=${pro.churn.avg_age_days} days, Authors=${pro.churn.unique_authors}
[/PROFESSIONAL_SUMMARY]

[RESILIENCE_SUMMARY]
ERROR_DISCIPLINE: ${res.error_discipline_score || "N/A"} (0-5)
DEFENSIVE_POSTURE: ${res.defensive_posture_score || "N/A"} (0-5)
OPTIMIZATION: ${res.optimization_score || "N/A"} (0-5)
ANTI_PATTERNS: ${res.common_antipatterns.join(', ') || "None Detected"}
[/RESILIENCE_SUMMARY]
[/EXTENDED_METRICS]`;
    }

    static get SCORING_INSTRUCTION() {
        return `### MANDATORY METRICS (High-Resolution):
LOGIC HEALTH: SOLID={solid}, Modularity={modularity}
KNOWLEDGE HEALTH: Clarity={clarity}, Discipline={discipline}
SENIORITY SIGNALS (0-5):
  - Semantic: {semantic}
  - Resilience: {resilience}
  - Resource Mindfulness: {resources}
  - Auditability: {auditability}
  - Domain Fidelity: {domain_fidelity}

RULE: Use these averages to determine the 'score' in traits.
Score = (LOGIC_AVG * 20) or (KNOWLEDGE_AVG * 20).`;
    }

    /**
     * Elite Technical Curator Prompt (from DeepCurator)
     */
    static get CURATOR_IDENTITY_PROMPT() {
        return `You are an ELITE TECHNICAL CURATOR. Your goal is to transform Worker-analyzed code into an IMPACT PROFILE.
            
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
}
