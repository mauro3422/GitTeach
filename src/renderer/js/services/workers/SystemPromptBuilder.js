/**
 * SystemPromptBuilder - Builds system prompts for AI code analysis
 * Extracted from WorkerPromptBuilder to comply with SRP
 *
 * Responsibilities:
 * - Build comprehensive system prompts for technical profiling
 * - Define analysis protocols and scoring methodologies
 * - Specify response structures and evaluation criteria
 */

import { AnalysisPrompts } from '../../prompts/workers/AnalysisPrompts.js';

export class SystemPromptBuilder {
    /**
     * Build the system prompt for code analysis
     * @returns {string} Complete system prompt
     */
    buildSystemPrompt() {
        return AnalysisPrompts.SYSTEM_PROMPT;
    }

    /**
     * Get analysis protocol description
     * @returns {string} Protocol description
     */
    getProtocolDescription() {
        return "Semantic & Multidimensional protocol for technical profiling";
    }

    /**
     * Get scoring methodology
     * @returns {Object} Scoring methodology details
     */
    getScoringMethodology() {
        return {
            dualTrack: {
                logic: ["SOLID", "Modularity", "Complexity"],
                knowledge: ["Clarity", "Discipline", "Depth"]
            },
            senioritySignals: [
                "Resilience", "Auditability", "Domain Fidelity"
            ],
            dimensions: ["Social", "Security", "Testability"]
        };
    }

    /**
     * Validate system prompt structure
     * @param {string} prompt - System prompt to validate
     * @returns {boolean} True if valid structure
     */
    validatePromptStructure(prompt) {
        const requiredSections = [
            "DUAL-TRACK SCORING",
            "SENIORITY SIGNALS",
            "PROFESSIONAL CONTEXT",
            "RICH SEMANTIC METADATA",
            "MULTIDIMENSIONAL METRICS",
            "RESPONSE STRUCTURE"
        ];

        return requiredSections.every(section => prompt.includes(section));
    }
}
