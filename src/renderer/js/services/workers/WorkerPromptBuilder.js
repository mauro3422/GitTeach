/**
 * WorkerPromptBuilder - Builds prompts for AI code analysis
 * Extracted from AIWorkerPool to comply with SRP
 * 
 * Responsibilities:
 * - Build system prompts for code analysis
 * - Build user prompts with domain hints and language checks
 * - Pre-filter files that should be skipped
 * - Parse AI responses into structured data
 */
import { FileClassifier } from '../../utils/fileClassifier.js';

export class WorkerPromptBuilder {
    /**
     * Build the system prompt for code analysis
     */
    buildSystemPrompt() {
        return `You analyze code files for developer profiling.

STEP 1: Extract the most important function, class, or variable name from the code.
STEP 2: Based on that evidence, classify the domain.

OUTPUT FORMAT (exactly one line):
[DOMAIN] Brief description | Evidence: <paste_actual_code_fragment>

DOMAIN OPTIONS: UI, Backend, Business, System, Game, Script, Data, Science, DevOps, Config

IMPORTANT:
- The evidence MUST be copied from the actual code shown below.
- STRICT RULE: Do not classify as "Game" unless it mentions game engines (Unity, Godot), sprites, or gameplay loops. 
- Administrative, Medical, or Management code is "Business" or "System", NOT "Game".
- Science or Physics simulations are "Science", NOT "Game".
- If code is empty or under 50 characters, output: SKIP
- Never invent function names. Only cite what exists in the code.`;
    }

    /**
     * Build the user prompt for a file or batch
     * @param {Object} input - Single item or batch object
     * @returns {Object} { prompt: string, skipReason: string|null }
     */
    buildUserPrompt(input) {
        const isBatch = input.isBatch;
        const items = isBatch ? input.items : [input];
        const repo = items[0].repo;

        // Pre-filter check
        const skipCheck = FileClassifier.shouldSkip(items[0].path, items[0].content);
        if (skipCheck.skip && !isBatch) {
            return { prompt: null, skipReason: skipCheck.reason };
        }

        // Get domain hint from FileClassifier
        const domainHint = FileClassifier.getDomainHint(items[0].path, items[0].content);

        // Validate language integrity (detect Python in .js, etc.)
        const langCheck = FileClassifier.validateLanguageIntegrity(items[0].path, items[0].content);
        const langWarning = langCheck.valid ? '' : `\n⚠️ ANOMALY DETECTED: ${langCheck.anomaly}. Report this mismatch.\n`;

        let userPrompt;

        if (isBatch) {
            userPrompt = `Analyze these files from ${repo}:\n`;
            items.forEach((item) => {
                userPrompt += `\n--- ${item.path} ---\n\`\`\`\n${item.content.substring(0, 800)}\n\`\`\`\n`;
            });
            userPrompt += `\nIdentify the synergy between these files and what they demonstrate about the developer:`;
        } else {
            // Include domain hint and language warning if available
            const hintLine = domainHint ? `\n${domainHint}\n` : '';
            userPrompt = `${langWarning}${hintLine}Analyze this file from ${repo}: ${items[0].path}
\`\`\`
${items[0].content.substring(0, 1500)}
\`\`\`
Tell me what it demonstrates about the developer:`;
        }

        return {
            prompt: userPrompt,
            skipReason: null,
            langCheck: langCheck
        };
    }

    /**
     * Parse AI response into structured data
     * @param {string} summary - Raw AI response
     * @returns {Object|null} Parsed data or null
     */
    parseResponse(summary) {
        const trimmed = summary.trim();

        // Check for SKIP
        if (trimmed.toUpperCase().startsWith('SKIP') || trimmed.includes('[SKIP]')) {
            return { tool: 'skip' };
        }

        // Try to extract structured data from plain text
        // Format: [DOMAIN] Description | Evidence: fragment
        const domainMatch = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/s);
        if (domainMatch) {
            const domain = domainMatch[1];
            const rest = domainMatch[2];
            const evidenceMatch = rest.match(/\|\s*Evidence:\s*(.+)$/si);
            const description = evidenceMatch ? rest.replace(evidenceMatch[0], '').trim() : rest.trim();
            const evidence = evidenceMatch ? evidenceMatch[1].trim() : '';

            return {
                tool: 'analysis',
                params: {
                    insight: description.substring(0, 100),
                    technical_strength: domain,
                    impact: evidence || 'See analysis'
                }
            };
        }

        // No structured format found, return null (raw summary is still valid)
        return null;
    }

    /**
     * Post-process summary with anomaly tagging
     * @param {string} summary - AI response
     * @param {Object} langCheck - Language integrity check result
     * @returns {string} Processed summary
     */
    postProcessSummary(summary, langCheck) {
        if (!langCheck.valid) {
            return `⚠️ INTEGRITY ANOMALY: ${langCheck.anomaly} | ${summary}`;
        }
        return summary;
    }
}
