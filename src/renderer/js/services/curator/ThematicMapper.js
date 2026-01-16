/**
 * ThematicMapper - Executes parallel thematic analysis layers
 * Extracted from DeepCurator to comply with SRP
 * 
 * Responsibilities:
 * - Execute 3 parallel AI analysis layers (architecture, habits, stack)
 * - Generate technical prompts for each layer
 * - Aggregate thematic analysis results
 */
import { AIService } from '../aiService.js';
import { Logger } from '../../utils/logger.js';
import { AISlotPriorities } from '../ai/AISlotManager.js';

export class ThematicMapper {
    /**
     * Build thematic prompts for a user
     * @param {string} username - GitHub username
     * @returns {Object} Prompts for each layer
     */
    buildThematicPrompts(username) {
        return {
            architecture: `YOU ARE THE CRITICAL SYSTEM AUDITOR. Your goal is to identify the REAL ARCHITECTURAL MATURITY of ${username}.
            
            STRICT PROTOCOL:
            1. <thinking>: Analyze recurring patterns vs standard frameworks. Detect domain specialization and structural rigor.
            2. REPORT: Generate a forensic analysis citing specific file paths. 
            
            RULE: If the code is boilerplate, label it as "Standard Implementation". No marketing fluff.`,

            habits: `YOU ARE THE SENIOR CODE QUALITY AUDITOR. Analyze the files and extract ${username}'s CODING HABITS:
            
            STRICT PROTOCOL:
            1. <thinking>: Critique language integrity, robustness (error handling), and evolution from scripter to architect.
            2. REPORT: Be honest and critical. Cite evidence for every claim.
            
            RULE: Avoid generic praise. If you see "INTEGRITY ANOMALY", be severe.`,

            stack: `YOU ARE THE PERFORMANCE DATA MINER. Map the TECHNICAL STACK of ${username}:
            
            STRICT PROTOCOL:
            1. <thinking>: Search for deep tech usage vs mere library calls. Identify manual optimizations or real automation.
            2. REPORT: Maintain a neutral, forensic tone.
            
            RULE: Distinguish between "using" and "implementing". Cite evidence.`
        };
    }

    /**
     * Execute thematic analysis for all layers IN PARALLEL
     * @param {string} username - GitHub username
     * @param {string} curatedInsightsText - Formatted curated insights
     * @returns {Promise<Object>} Analysis results by layer
     */
    async executeMapping(username, curatedInsightsText, healthReport = null) {
        const prompts = this.buildThematicPrompts(username);

        // Grounding with Health Report (Objectivity Filter)
        let groundingInstruction = "";
        if (healthReport) {
            groundingInstruction = `
### GLOBAL HEALTH AUDIT (Mathematical Truth):
- SOLID Average: ${healthReport.averages.solid}/5
- Modularity: ${healthReport.averages.modularity}/5
- Analyzed Files: ${healthReport.volume.analyzedFiles} / Total: ${healthReport.volume.totalFiles}
- Significance: ${healthReport.volume.status} (${healthReport.volume.coverage} coverage)

INSTRUCTION: You MUST ground your analysis in these numbers. 
If status is 'EXPERIMENTAL' or 'SURFACE', be very cautious and do not over-praise.
If SOLID average is below 3.0, mention areas for improvement as a mentor.`;
        }

        Logger.mapper('Executing 3 layers of deep technical analysis...');

        const [architecture, habits, stack] = await Promise.all([
            this._executeLayer('architecture', `${prompts.architecture}\n${groundingInstruction}`, curatedInsightsText),
            this._executeLayer('habits', `${prompts.habits}\n${groundingInstruction}`, curatedInsightsText),
            this._executeLayer('stack', prompts.stack, curatedInsightsText) // Stack is less about bias
        ]);

        Logger.mapper('All 3 layers completed in parallel.');

        return { architecture, habits, stack };
    }

    /**
     * Execute a single analysis layer
     * @private
     */
    async _executeLayer(key, systemPrompt, curatedInsightsText) {
        try {
            Logger.mapper(`Analyzing layer: ${key}...`);
            const result = await AIService.callAI(
                `Curator Mapper: ${key}`,
                `${systemPrompt}\n\nCURATED INSIGHTS:\n${curatedInsightsText}`,
                0.1,
                null,
                null,
                AISlotPriorities.BACKGROUND
            );
            return result;
        } catch (e) {
            Logger.error('ThematicMapper', `Error in mapper ${key}: ${e.message}`);
            return `Error in mapper ${key}: ${e.message}`;
        }
    }

    /**
     * Format results for consumption by DNASynthesizer
     * @param {Object} results - Raw mapper results
     * @returns {Array} Formatted array of results
     */
    formatForSynthesis(results) {
        return [
            results.architecture || 'No architecture analysis',
            results.habits || 'No habits analysis',
            results.stack || 'No stack analysis'
        ];
    }
}
