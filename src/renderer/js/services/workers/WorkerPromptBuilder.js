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
        return `You are a Code Mining Worker for GitTeach. Analyze code files for developer profiling.
        
### DUAL MISSION:
1. SUMMARY (Qualitative): A technical description of what the code demonstrates.
2. METRICS (Quantitative): Numeric health metrics for the file.

### OUTPUT FORMAT:
[DOMAIN] | [CONFIDENCE:0.0-1.0] | [COMPLEXITY:1-5]
SUMMARY: <Technical insight about the developer's skill in this file>.
METRICS: {"solid": 1-5, "modularity": 1-5, "readability": 1-5, "patterns": ["pattern1", "pattern2"]}
EVIDENCE: <Actual code fragment copied from original source>

### DOMAIN OPTIONS: UI, Backend, Business, System, Game, Script, Data, Science, DevOps, Config

### CONSTRAINTS:
- Keep SUMMARY under 150 chars.
- METRICS must be valid JSON on its own line.
- EVIDENCE is mandatory and must be exact.
- Do not be overly optimistic. If the code is basic, assign METRICS 1 or 2.`;
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

        if (trimmed.toUpperCase().startsWith('SKIP') || trimmed.includes('[SKIP]')) {
            return { tool: 'skip' };
        }

        const lines = trimmed.split('\n');
        const header = lines[0]; // [DOMAIN] | [CONF:X] | [COMP:X]
        const summaryLine = lines.find(l => l.startsWith('SUMMARY:'));
        const metricsLine = lines.find(l => l.startsWith('METRICS:'));
        const evidenceLine = lines.find(l => l.startsWith('EVIDENCE:'));

        if (header && summaryLine && metricsLine && evidenceLine) {
            const headerMatch = header.match(/\[([^\]]+)\]\s*\|\s*\[CONF:([\d\.]+)\]\s*\|\s*\[COMP:(\d+)\]/);

            let metrics = {};
            try {
                metrics = JSON.parse(metricsLine.replace('METRICS:', '').trim());
            } catch (e) {
                metrics = { solid: 2, modularity: 2, readability: 2, patterns: [] };
            }

            return {
                tool: 'analysis',
                params: {
                    insight: summaryLine.replace('SUMMARY:', '').trim(),
                    technical_strength: headerMatch ? headerMatch[1] : 'General',
                    impact: evidenceLine.replace('EVIDENCE:', '').trim(),
                    confidence: headerMatch ? parseFloat(headerMatch[2]) : 0.7,
                    complexity: headerMatch ? parseInt(headerMatch[3]) : 2,
                    metadata: metrics // NEW: Carries the structured metrics for widgets/refinery
                }
            };
        }

        // Fallback for legacy or loose parsing
        return this._looseParse(trimmed);
    }

    /**
     * Loose parsing fallback for broken formats
     */
    _looseParse(text) {
        const domainMatch = text.match(/\[([^\]]+)\]/);
        const insightMatch = text.match(/SUMMARY:\s*(.*)/i) || text.match(/Description:\s*(.*)/i);
        const evidenceMatch = text.match(/EVIDENCE:\s*(.*)/i) || text.match(/Evidence:\s*(.*)/i);

        if (domainMatch || insightMatch) {
            return {
                tool: 'analysis',
                params: {
                    insight: insightMatch ? insightMatch[1].substring(0, 150) : "Technical analysis",
                    technical_strength: domainMatch ? domainMatch[1] : 'General',
                    impact: evidenceMatch ? evidenceMatch[1] : 'See code',
                    confidence: 0.5,
                    complexity: 2,
                    metadata: { solid: 2, modularity: 2, readability: 2, patterns: [] }
                }
            };
        }
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
