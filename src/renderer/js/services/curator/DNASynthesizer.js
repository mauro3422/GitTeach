/**
 * DNASynthesizer - Synthesizes Technical DNA from thematic analyses
 * Extracted from DeepCurator to comply with SRP
 *
 * Responsibilities:
 * - Orchestrate DNA synthesis using specialized modules
 * - Coordinate professional context, code churn, and ecosystem analysis
 * - Build synthesis prompt with cognitive vaccines
 * - Parse AI response with multi-pass cleaning
 * - Provide fallback mechanisms when AI fails
 */
import { AIService } from '../aiService.js';
import { Logger } from '../../utils/logger.js';
import { AISlotPriorities } from '../ai/AISlotPriorities.js';
import { DNAPromptBuilder } from './DNAPromptBuilder.js';
import { DNAParser } from './DNAParser.js';
import { DNASchemaValidator } from './DNASchemaValidator.js';
import { pipelineEventBus } from '../pipeline/PipelineEventBus.js';

export class DNASynthesizer {
    constructor() {
        // Compose specialized modules
        this.promptBuilder = new DNAPromptBuilder();
        this.parser = new DNAParser();
        this.schemaValidator = new DNASchemaValidator();
    }

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
                },
                professional_context: {
                    type: "object",
                    properties: {
                        quality_index: { type: "string" }, // e.g. "High (78%)"
                        ecosystem_profile: { type: "string" },
                        collaboration_style: { type: "string" },
                        seniority_vibe: { type: "string" },
                        code_churn: { type: "string" }
                    }
                },
                resilience_context: {
                    type: "object",
                    properties: {
                        error_discipline: { type: "string" },
                        defensive_posture: { type: "string" },
                        optimization: { type: "string" },
                        top_antipatterns: { type: "array", items: { type: "string" } }
                    }
                },
                anomalies: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            trait: { type: "string" },
                            impact: { type: "string" },
                            evidence: { type: "string" }
                        },
                        required: ["trait", "impact", "evidence"]
                    }
                }
            },
            required: ["thought", "bio", "traits", "distinctions", "signature_files", "code_health", "verdict", "tech_radar", "professional_context", "resilience_context", "anomalies"]
        };
    }

    /**
     * Build the synthesis prompt
     * @param {string} username - GitHub username
     * @param {Array} thematicAnalyses - Results from ThematicMapper
     * @param {Object} stats - Statistics from InsightsCurator
     * @param {number} rawCount - Total raw findings count
     * @param {number} curatedCount - Curated insights count
     * @param {Object} holisticMetrics - Holistic metrics
     * @param {Object} healthReport - Health report
     * @returns {string} Full synthesis prompt
     */
    buildSynthesisPrompt(username, thematicAnalyses, stats, rawCount, curatedCount, holisticMetrics = null, healthReport = null) {
        return this.promptBuilder.buildSynthesisPrompt(username, thematicAnalyses, stats, rawCount, curatedCount, holisticMetrics, healthReport);
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
        Logger.reducer('Synthesizing Developer DNA on CPU with HIGH FIDELITY...');

        // COMPRESSION GATE: Ensure thematic reports are within safety limits (4k each approx)
        const { TaskDivider } = await import('../TaskDivider.js');

        // Handle both legacy strings and new structured objects
        // INTERFACE FIX: Convert object to array for internal processing if needed
        const analysesArray = Array.isArray(thematicAnalyses)
            ? thematicAnalyses
            : [thematicAnalyses.architecture, thematicAnalyses.habits, thematicAnalyses.stack].filter(Boolean);

        const compressedReports = analysesArray.map(report => {
            if (typeof report === 'string') return TaskDivider.smartCompress(report, 5000);

            // It's a structured object { analysis, evidence_uids }
            const compressedText = TaskDivider.smartCompress(report.analysis || '', 5000);
            return {
                ...report,
                analysis: compressedText
            };
        });

        const prompt = this.buildSynthesisPrompt(username, compressedReports, stats, rawCount, curatedCount, holisticMetrics, healthReport);

        // Grounding instruction for Synthesizer
        const { SynthesisPrompts } = await import('../../prompts/curator/SynthesisPrompts.js');
        const scoringInstruction = SynthesisPrompts.SCORING_INSTRUCTION;
        const schema = this.schemaValidator.getDNASchema();

        // Use CPU server to avoid blocking GPU workers/chat
        const rawResponse = await AIService.callAI_CPU(`${prompt}\n${scoringInstruction}`, "GENERATE TECHNICAL DNA OBJECT NOW.", 0.1, 'json_object', schema);

        if (!rawResponse || (typeof rawResponse === 'object' && rawResponse.error)) {
            const errorMsg = rawResponse?.error || 'Unknown AI error';
            Logger.error('DNASynthesizer', `Synthesis failed: ${errorMsg}`);
            return { dna: this.parser.buildFallback(rawResponse, traceabilityMap, errorMsg), traceability_map: traceabilityMap };
        }

        try {
            const dna = this.parser.parseResponse(rawResponse);

            // Final Step: Technical Linking (Graph V3)
            this.parser.linkMemoryNodes(dna, traceabilityMap);

            // EXTRA: Dual-Track Presentation Data
            const enhancedDna = this.parser.enhanceWithPresentationData(dna, healthReport, holisticMetrics);

            pipelineEventBus.emit('dna:radar:update', { dna: enhancedDna });

            return { dna: enhancedDna, traceability_map: traceabilityMap };
        } catch (e) {
            Logger.error('DNASynthesizer', `JSON Parsing failed: ${e.message}`);
            console.warn("[DNASynthesizer] RAW AI OUTPUT (FOR DEBUGGING):", rawResponse);

            const fallbackDna = this.parser.buildFallback(rawResponse, traceabilityMap, e.message);
            return { dna: fallbackDna, traceability_map: traceabilityMap };
        }
    }


}