/**
 * DNAParser - Robust parsing of AI responses for DNA synthesis
 * Extracted from DNASynthesizer to comply with SRP
 *
 * Responsibilities:
 * - Parse AI response with multi-pass cleaning
 * - Handle JSON extraction and validation
 * - Provide fallback mechanisms when parsing fails
 * - Link memory nodes with technical evidence
 */
import { Logger } from '../../utils/logger.js';

export class DNAParser {
    /**
     * Parse AI response with multi-pass cleaning
     * @param {string} rawResponse - Raw response from AI
     * @returns {Object} Parsed DNA object
     * @throws {Error} If parsing fails completely
     */
    parseResponse(rawResponse) {
        let cleanResponse = rawResponse;

        // Remove markdown code blocks if present
        if (cleanResponse.includes("```json")) {
            cleanResponse = cleanResponse.split("```json")[1].split("```")[0];
        } else if (cleanResponse.includes("```")) {
            cleanResponse = cleanResponse.split("```")[1].split("```")[0];
        }

        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[DNAParser] STRICT FAIL: No JSON found. Raw response start:", rawResponse.substring(0, 200));
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
     * @param {string} rawResponse - Raw response for rescue attempts
     * @param {Object} traceabilityMap - Map for evidence generation
     * @param {string} errorMessage - Original error message
     * @returns {Object} Fallback DNA object
     */
    buildFallback(rawResponse, traceabilityMap, errorMessage) {
        let rescuedBio = "DNA synthesized (partial parse). " + (rawResponse.substring(0, 500));
        rescuedBio = rescuedBio.replace(/\*\*/g, '').replace(/###/g, '').trim();

        return {
            bio: rescuedBio,
            traits: this.generateTraitsFromMap(traceabilityMap, rawResponse),
            verdict: this.extractVerdict(rawResponse),
            parsing_error: true,
            raw_error: errorMessage
        };
    }

    /**
     * Extract verdict from raw text
     * @param {string} text - Raw response text
     * @returns {string} Extracted verdict or fallback
     */
    extractVerdict(text) {
        const verdictMatch = text.match(/"verdict":\s*"(.*?)"/);
        if (verdictMatch) return verdictMatch[1];

        const mdTitle = text.match(/# (.*)/) || text.match(/\*\*Verdict\*\*:\s*(.*)/i);
        if (mdTitle) return mdTitle[1].replace(/\*/g, '').trim();

        return "Technical Developer (DNA Curated)";
    }

    /**
     * Rescue traits from markdown if JSON fails
     * @param {string} text - Raw response text
     * @returns {Array|null} Rescued traits or null
     */
    rescueTraitsFromMarkdown(text) {
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
     * @param {Object} map - Traceability map
     * @param {string} rawResponse - Raw response for rescue attempts
     * @returns {Array} Generated traits
     */
    generateTraitsFromMap(map, rawResponse = null) {
        if (rawResponse) {
            const rescued = this.rescueTraitsFromMarkdown(rawResponse);
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
     * @param {Object} dna - DNA object to link
     * @param {Object} traceabilityMap - Map of concepts to source files
     */
    linkMemoryNodes(dna, traceabilityMap) {
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

    /**
     * Enhance DNA with presentation data
     * @param {Object} dna - DNA object
     * @param {Object} healthReport - Health report from MetricRefinery
     * @param {Object} holisticMetrics - Holistic metrics
     * @returns {Object} Enhanced DNA
     */
    enhanceWithPresentationData(dna, healthReport, holisticMetrics) {
        if (!healthReport) return dna;

        // Add code health
        dna.code_health = {
            logic_integrity: Math.round(parseFloat(healthReport.logic_health.solid) * 20) || 0,
            knowledge_integrity: Math.round(parseFloat(healthReport.knowledge_health.clarity) * 20) || 0,
            details: dna.code_health?.details || "Calculated using Dual-Track protocol."
        };

        // Add presentation data
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

        // Add holistic metrics to presentation
        if (holisticMetrics) {
            dna.presentation.holistic = {
                versatility: parseFloat(holisticMetrics.versatility_index) || 0,
                consistency: parseFloat(holisticMetrics.consistency_score) || 0,
                evolution: holisticMetrics.evolution_rate
            };
        }

        // Map extended metadata
        if (healthReport.extended_metadata) {
            dna.extended_metadata = {
                social_score: parseFloat(healthReport.extended_metadata.dimensions.social) || 0,
                security_score: parseFloat(healthReport.extended_metadata.dimensions.security) || 0,
                testability_score: parseFloat(healthReport.extended_metadata.dimensions.testability) || 0,
                dominant_stack_maturity: healthReport.extended_metadata.semantic.dominant_maturity
            };
        }

        return dna;
    }
}
