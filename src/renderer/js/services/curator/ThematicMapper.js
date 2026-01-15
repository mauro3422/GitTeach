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

export class ThematicMapper {
    /**
     * Build thematic prompts for a user
     * @param {string} username - GitHub username
     * @returns {Object} Prompts for each layer
     */
    buildThematicPrompts(username) {
        return {
            architecture: `YOU ARE THE ELITE SYSTEM ARCHITECT. Your goal is to extract the ARCHITECTURAL DNA of ${username}.
            
            Analyze these CURATED file insights (with their real code EVIDENCE) and identify:
            1. RECURRING PATTERNS: Specific implementations (e.g., "Custom IPC Bridge", "Centralized State").
            2. DOMAIN SPECIALIZATION: Distinguish between Business Systems, Game Engines, and Science Simulations.
            3. STRUCTURAL RIGOR: Cite files that serve as "Anchors" (controllers, managers).
            
            STRICT RULE: Every claim MUST cite at least one file path and reference the provided evidence.`,

            habits: `YOU ARE THE SENIOR CODE QUALITY AUDITOR. Analyze these files and extract ${username}'s CODING HABITS:
            
            1. LANGUAGE INTEGRITY: If you see "INTEGRITY ANOMALY" tags, comment on the developer's language-switching or potential mismatch issues.
            2. ROBUSTNESS: How are edge cases handled in the evidence snippets?
            3. EVOLUTION: Can you see a shift from "Scripter" (single files) to "Architect" (modular systems)?
            
            STRICT RULE: Cite real file paths and code fragments for every habit detected.`,

            stack: `YOU ARE THE FULL-STACK PERFORMANCE EXPERT. Map the TECHNICAL STACK of ${username}:
            
            1. ADVANCED USAGE: Detect "Vulkan", "GPU acceleration", "Scientific formulas", "Medical data structures".
            2. PERFORMANCE: Cite optimizations like O(1) algorithms, caching, or parallelization found in evidence.
            3. TOOLING: Mention build scripts (e.g., ps1, yml) and automation.
            
            STRICT RULE: Be extremely technical. Use provided evidence snippets to back up your stack analysis.`
        };
    }

    /**
     * Execute thematic analysis for all layers
     * @param {string} username - GitHub username
     * @param {string} curatedInsightsText - Formatted curated insights
     * @returns {Promise<Object>} Analysis results by layer
     */
    async executeMapping(username, curatedInsightsText) {
        const prompts = this.buildThematicPrompts(username);
        const results = {};

        Logger.mapper('Executing 3 layers of deep technical analysis...');

        for (const [key, systemPrompt] of Object.entries(prompts)) {
            try {
                Logger.mapper(`Analyzing layer: ${key}...`);
                const result = await AIService.callAI(
                    `Curator Mapper: ${key}`,
                    `${systemPrompt}\n\nCURATED INSIGHTS:\n${curatedInsightsText}`,
                    0.1
                );
                results[key] = result;
            } catch (e) {
                Logger.error('ThematicMapper', `Error in mapper ${key}: ${e.message}`);
                results[key] = `Error in mapper ${key}: ${e.message}`;
            }
        }

        return results;
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
