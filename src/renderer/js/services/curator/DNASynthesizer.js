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

export class DNASynthesizer {
    /**
     * Get the DNA JSON Schema
     * @returns {Object} JSON Schema for technical DNA
     */
    getDNASchema() {
        return {
            type: "object",
            properties: {
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
                signature_files: { type: "array", items: { type: "string" } },
                code_health: {
                    type: "object",
                    properties: {
                        integrity_score: { type: "integer" },
                        anomalies_found: { type: "boolean" },
                        details: { type: "string" }
                    },
                    required: ["integrity_score", "anomalies_found", "details"]
                },
                verdict: { type: "string" }
            },
            required: ["bio", "traits", "signature_files", "code_health", "verdict"]
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
    buildSynthesisPrompt(username, thematicAnalyses, stats, rawCount, curatedCount) {
        return `YOU ARE THE TECHNICAL INTELLIGENCE REDUCER.
Your goal is to synthesize the final technical identity of <user>${username}</user>.

<specialist_reports>
  <architecture>${thematicAnalyses[0]}</architecture>
  <habits>${thematicAnalyses[1]}</habits>
  <stack_tech>${thematicAnalyses[2]}</stack_tech>
</specialist_reports>

<statistical_volume>
  - Total Files: ${rawCount}
  - Analyzed Files: ${curatedCount}
  - Repositories: ${stats.repoCount}
  - Top Patterns: ${stats.topStrengths.map(s => `${s.name} (${s.count})`).join(', ')}
</statistical_volume>

<cognitive_vaccines>
- DO NOT invent code that is not in the reports.
- DO NOT use generic descriptions like "experienced developer". 
- CITE specific files (e.g., sketch-ui/app.js) for every trait.
</cognitive_vaccines>

ANALYTICAL STEPS:
1. Examine <specialist_reports> to find the "Soul" of the code (e.g., custom rendering, medical data).
2. Rank the 5 most dominant technical domains (e.g., "Systems Architecture", "Performance", "UI/UX"). 
3. Assign scores (1-100) based on the depth of implementation shown in the reports.
4. For each trait, include an array of "evidence_uids" citing the [ID:mem_xxxx] tags from the reports.
5. Formulate a dense, 5-sentence biography citing specific files.
6. Output EXACTLY the requested JSON schema.

STRICT RULE: NO MARKDOWN. NO INTRO. START WITH '{'.`;
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
    async synthesize(username, thematicAnalyses, stats, traceabilityMap, rawCount, curatedCount) {
        Logger.reducer('Synthesizing Developer DNA with HIGH FIDELITY...');

        const prompt = this.buildSynthesisPrompt(username, thematicAnalyses, stats, rawCount, curatedCount);
        const schema = this.getDNASchema();

        const rawResponse = await AIService.callAI(prompt, "GENERATE TECHNICAL DNA OBJECT NOW.", 0.1, 'json_object', schema);

        try {
            const dna = this._parseResponse(rawResponse);

            // Final Step: Technical Linking (Graph V3)
            // Manually inject UIDs based on filename matching to bridge AI descriptions with real memory nodes
            this._linkMemoryNodes(dna, traceabilityMap);

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
