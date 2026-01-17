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
import { SynthesisPrompts } from '../../prompts/curator/SynthesisPrompts.js';

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
${SynthesisPrompts.SYSTEM_ROLE}

${SynthesisPrompts.buildContext({
            username,
            rawCount,
            curatedCount,
            stats,
            thematicAnalyses,
            holisticMetrics,
            healthReport
        })}

${SynthesisPrompts.TASK_DEFINITION}

${SynthesisPrompts.CONSTRAINTS}

${SynthesisPrompts.OUTPUT_FORMAT}
`;
    }
}
