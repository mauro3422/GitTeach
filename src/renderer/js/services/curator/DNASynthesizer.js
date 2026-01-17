/**
 * DNASynthesizer - Synthesizes Technical DNA from thematic analyses
 * Extracted from DeepCurator to comply with SRP
 * 
 * Responsibilities:
 * - Define DNA JSON schema
 * - Build synthesis prompt with cognitive vaccines
 * - Parse AI response with multi-pass cleaning
 * - Provide fallback mechanisms when AI fails
 */
import { AIService } from '../aiService.js';
import { Logger } from '../../utils/logger.js';
import { AISlotPriorities } from '../ai/AISlotManager.js';

export class DNASynthesizer {
    /**
     * Get the DNA JSON Schema
     * @returns {Object} JSON Schema for technical DNA
     */
    getDNASchema() {
        return {
            type: "object",
            properties: {
                thought: { type: "string" },
                bio: { type: "string" },
                traits: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            score: { type: "integer" },
                            details: { type: "string" },
                            evidence: { type: "string" },
                            evidence_uids: { type: "array", items: { type: "string" } }
                        },
                        required: ["name", "score", "details", "evidence", "evidence_uids"]
                    }
                },
                distinctions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            signal: { type: "string" },
                            badge: { type: "string" },
                            justification: { type: "string" }
                        },
                        required: ["signal", "badge", "justification"]
                    }
                },
                signature_files: { type: "array", items: { type: "string" } },
                code_health: {
                    type: "object",
                    properties: {
                        logic_integrity: { type: "integer" },
                        knowledge_integrity: { type: "integer" },
                        details: { type: "string" }
                    },
                    required: ["logic_integrity", "knowledge_integrity", "details"]
                },
                verdict: { type: "string" },
                // NEW: Tech Radar & Extended Metadata
                tech_radar: {
                    type: "object",
                    properties: {
                        adopt: { type: "array", items: { type: "string" } },
                        trial: { type: "array", items: { type: "string" } },
                        assess: { type: "array", items: { type: "string" } },
                        hold: { type: "array", items: { type: "string" } }
                    }
                },
                extended_metadata: {
                    type: "object",
                    properties: {
                        social_score: { type: "number" },
                        security_score: { type: "number" },
                        testability_score: { type: "number" },
                        dominant_stack_maturity: { type: "string" }
                    }
                }
            },
            required: ["thought", "bio", "traits", "distinctions", "signature_files", "code_health", "verdict", "tech_radar"]
        };
    }

    /**
     * Build the synthesis prompt
     * @param {string} username - GitHub username
     * @param {Array} thematicAnalyses - Results from ThematicMapper
     * @param {Object} stats - Statistics from InsightsCurator
     * @param {number} rawCount - Total raw findings count
     * @param {number} curatedCount - Curated insights count
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
</constraints>

<output_format>
JSON Object only. Starts with '{'.
</output_format>
`;
    }

    /**
     * Synthesize Technical DNA
     * @param {string} username - GitHub username
     * @param {Array} thematicAnalyses - Results from ThematicMapper [architecture, habits, stack]
     * @param {Object} stats - Statistics from InsightsCurator
     * @param {Object} traceabilityMap - Map of concepts to source files
     * @param {number} rawCount - Total raw findings count
     * @param {number} curatedCount - Curated insights count
     * @returns {Promise<Object>} { dna, traceability_map }
     */
    async synthesize(username, thematicAnalyses, stats, traceabilityMap, rawCount, curatedCount, healthReport = null, holisticMetrics = null) {
        Logger.reducer('Synthesizing Developer DNA with HIGH FIDELITY...');

        const prompt = this.buildSynthesisPrompt(username, thematicAnalyses, stats, rawCount, curatedCount, holisticMetrics, healthReport);

        // Grounding instruction for Synthesizer
        let scoringInstruction = "";
        if (healthReport) {
            scoringInstruction = `
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

        const schema = this.getDNASchema();

        const rawResponse = await AIService.callAI(`${prompt}\n${scoringInstruction}`, "GENERATE TECHNICAL DNA OBJECT NOW.", 0.1, 'json_object', schema, AISlotPriorities.BACKGROUND);

        try {
            const dna = this._parseResponse(rawResponse);

            // Final Step: Technical Linking (Graph V3)
            this._linkMemoryNodes(dna, traceabilityMap);

            // EXTRA: Dual-Track Presentation Data
            if (healthReport) {
                dna.code_health = {
                    logic_integrity: Math.round(parseFloat(healthReport.logic_health.solid) * 20) || 0,
                    knowledge_integrity: Math.round(parseFloat(healthReport.knowledge_health.clarity) * 20) || 0,
                    details: dna.code_health?.details || "Calculated using Dual-Track protocol."
                };

                dna.presentation = {
                    logic_radar: [
                        { label: 'SOLID', score: Math.round(parseFloat(healthReport.logic_health.solid) * 20) },
                        { label: 'Modularidad', score: Math.round(parseFloat(healthReport.logic_health.modularity) * 20) },
                        { label: 'Complejidad', score: Math.round(parseFloat(healthReport.logic_health.complexity) * 20) }
                    ],
                    knowledge_radar: [
                        { label: 'Claridad', score: Math.round(parseFloat(healthReport.knowledge_health.clarity) * 20) },
                        { label: 'Disciplina', score: Math.round(parseFloat(healthReport.knowledge_health.discipline) * 20) },
                        { label: 'Profundidad', score: Math.round(parseFloat(healthReport.knowledge_health.depth) * 20) }
                    ],
                    seniority_badges: (dna.distinctions || []).map(d => ({
                        name: d.badge,
                        description: d.justification,
                        signal: d.signal
                    }))
                };

                // NEW: Inject Holistic Metrics into Presentation
                if (holisticMetrics) {
                    dna.presentation.holistic = {
                        versatility: parseFloat(holisticMetrics.versatility_index) || 0,
                        consistency: parseFloat(holisticMetrics.consistency_score) || 0,
                        evolution: holisticMetrics.evolution_rate
                    };
                }

                // NEW: Map Extended Metadata to DNA root
                if (healthReport.extended_metadata) {
                    dna.extended_metadata = {
                        social_score: parseFloat(healthReport.extended_metadata.dimensions.social) || 0,
                        security_score: parseFloat(healthReport.extended_metadata.dimensions.security) || 0,
                        testability_score: parseFloat(healthReport.extended_metadata.dimensions.testability) || 0,
                        dominant_stack_maturity: healthReport.extended_metadata.semantic.dominant_maturity
                    };
                }
            }

            return { dna, traceability_map: traceabilityMap };
        } catch (e) {
            Logger.error('DNASynthesizer', `JSON Parsing failed: ${e.message}`);
            console.warn("[DNASynthesizer] RAW AI OUTPUT (FOR DEBUGGING):", rawResponse);

            const fallbackDna = this._buildFallback(rawResponse, traceabilityMap, e.message);
            return { dna: fallbackDna, traceability_map: traceabilityMap };
        }
    }

    /**
     * Parse AI response with multi-pass cleaning
     * @private
     */
    _parseResponse(rawResponse) {
        let cleanResponse = rawResponse;

        // Remove markdown code blocks if present
        if (cleanResponse.includes("```json")) {
            cleanResponse = cleanResponse.split("```json")[1].split("```")[0];
        } else if (cleanResponse.includes("```")) {
            cleanResponse = cleanResponse.split("```")[1].split("```")[0];
        }

        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[DNASynthesizer] STRICT FAIL: No JSON found. Raw response start:", rawResponse.substring(0, 200));
            throw new Error("No JSON object found in AI response");
        }

        let jsonData = jsonMatch[0];

        // Pre-parsing cleanup
        jsonData = jsonData.replace(/\n/g, ' ').replace(/\r/g, ' ');
        jsonData = jsonData.replace(/,\s*([\}\]])/g, '$1');

        return JSON.parse(jsonData);
    }

    /**
     * Build fallback DNA when AI fails
     * @private
     */
    _buildFallback(rawResponse, traceabilityMap, errorMessage) {
        let rescuedBio = "DNA synthesized (partial parse). " + (rawResponse.substring(0, 500));
        rescuedBio = rescuedBio.replace(/\*\*/g, '').replace(/###/g, '').trim();

        return {
            bio: rescuedBio,
            traits: this._generateTraitsFromMap(traceabilityMap, rawResponse),
            verdict: this._extractVerdict(rawResponse),
            parsing_error: true,
            raw_error: errorMessage
        };
    }

    /**
     * Extract verdict from raw text
     * @private
     */
    _extractVerdict(text) {
        const verdictMatch = text.match(/"verdict":\s*"(.*?)"/);
        if (verdictMatch) return verdictMatch[1];

        const mdTitle = text.match(/# (.*)/) || text.match(/\*\*Verdict\*\*:\s*(.*)/i);
        if (mdTitle) return mdTitle[1].replace(/\*/g, '').trim();

        return "Technical Developer (DNA Curated)";
    }

    /**
     * Rescue traits from markdown if JSON fails
     * @private
     */
    _rescueTraitsFromMarkdown(text) {
        const traits = [];
        const lines = text.split('\n');
        for (const line of lines) {
            const match = line.match(/^\d*\.?\s?\*?\*?(Architecture|Habits|Stack|Game Engines|Science|UI|Performance|DevOps)\*?\*?[:\-]\s*(.*)/i);
            if (match && traits.length < 5) {
                traits.push({
                    name: match[1],
                    score: 80,
                    details: match[2].substring(0, 150),
                    evidence: "Extracted from report"
                });
            }
        }
        return traits.length > 0 ? traits : null;
    }

    /**
     * Generate traits from statistical map
     * @private
     */
    _generateTraitsFromMap(map, rawResponse = null) {
        if (rawResponse) {
            const rescued = this._rescueTraitsFromMarkdown(rawResponse);
            if (rescued) return rescued;
        }

        return Object.entries(map)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 5)
            .map(([strength, refs]) => ({
                name: strength,
                score: Math.min(60 + (refs.length * 5), 95),
                details: `Detected as a recurring pattern across ${refs.length} files.`,
                evidence: refs.slice(0, 2).map(r => r.file).join(', '),
                evidence_uids: refs.slice(0, 5).map(r => r.uid).filter(id => !!id)
            }));
    }

    /**
     * Technical Linker - Bridges AI-synthesized traits with real MemoryNodes
     * @private
     */
    _linkMemoryNodes(dna, traceabilityMap) {
        if (!dna.traits || !traceabilityMap) return;

        dna.traits.forEach(trait => {
            // Priority 1: Keep only real UIDs if AI actually copied them correctly
            const existingUids = (trait.evidence_uids || []).filter(id => id.startsWith('mem_'));
            trait.evidence_uids = existingUids;

            // Priority 2: Robust Search in trait text
            const context = (trait.evidence || "") + " " + (trait.details || "");

            Object.values(traceabilityMap).forEach(refs => {
                refs.forEach(ref => {
                    if (!ref.uid || !ref.file) return;

                    // Match full path OR just the filename (basename)
                    const fileName = ref.file.split(/[\\/]/).pop();
                    const isMentioned = context.includes(ref.file) || (fileName && context.includes(fileName));

                    if (isMentioned) {
                        if (!trait.evidence_uids.includes(ref.uid)) {
                            trait.evidence_uids.push(ref.uid);
                        }
                    }
                });
            });

            // Limit to top 5 high-fidelity evidence links
            trait.evidence_uids = trait.evidence_uids.slice(0, 5);
        });
    }
}
