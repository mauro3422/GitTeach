/**
 * UserPromptBuilder - Builds user prompts for AI code analysis
 * Extracted from WorkerPromptBuilder to comply with SRP
 *
 * Responsibilities:
 * - Build user prompts with domain hints and language checks
 * - Handle batch processing for multiple files
 * - Integrate with FileClassifier for pre-filtering and hints
 * - Validate language integrity and provide warnings
 */
import { FileClassifier } from '../../utils/fileClassifier.js';
import { AnalysisPrompts } from '../../prompts/workers/AnalysisPrompts.js';

export class UserPromptBuilder {
    /**
     * Build the user prompt for a file or batch
     * @param {Object} input - Single item or batch object
     * @returns {Object} { prompt: string, skipReason: string|null, langCheck: Object }
     */
    buildUserPrompt(input) {
        const isBatch = input.isBatch;
        const items = isBatch ? input.items : [input];
        const repo = items[0].repo;

        // Pre-filter check
        const skipCheck = FileClassifier.shouldSkip(items[0].path, items[0].content);
        if (skipCheck.skip && !isBatch) {
            return { prompt: null, skipReason: skipCheck.reason, langCheck: null };
        }

        // Get domain hint from FileClassifier
        const domainHint = FileClassifier.getDomainHint(items[0].path, items[0].content);

        // Validate language integrity (detect Python in .js, etc.)
        const langCheck = FileClassifier.validateLanguageIntegrity(items[0].path, items[0].content);
        const langWarning = langCheck.valid ? '' : `\n⚠️ ANOMALY DETECTED: ${langCheck.anomaly}. Report this mismatch.\n`;

        let userPrompt;

        if (isBatch) {
            userPrompt = this.buildBatchPrompt(repo, items);
        } else {
            userPrompt = this.buildSingleFilePrompt(repo, items[0], domainHint, langWarning);
        }

        return {
            prompt: userPrompt,
            skipReason: null,
            langCheck: langCheck
        };
    }

    /**
     * Build prompt for batch file processing
     * @param {string} repo - Repository name
     * @param {Array} items - Array of file items
     * @returns {string} Batch prompt
     */
    buildBatchPrompt(repo, items) {
        return AnalysisPrompts.formatBatchFilesPrompt({
            repo: repo,
            files: items.map(item => `\n--- FILE: ${item.path} ---\n\`\`\`\n${item.content.substring(0, 800)}\n\`\`\``).join('\n')
        });
    }

    /**
     * Build prompt for single file processing
     * @param {string} repo - Repository name
     * @param {Object} item - Single file item
     * @param {string} domainHint - Domain hint from classifier
     * @param {string} langWarning - Language warning if any
     * @returns {string} Single file prompt
     */
    buildSingleFilePrompt(repo, item, domainHint, langWarning) {
        return AnalysisPrompts.formatSingleFilePrompt({
            repo: repo,
            path: item.path,
            code: item.content.substring(0, 3000),
            domainHint: domainHint,
            langWarning: langWarning,
            hintLine: domainHint ? `SUGGESTED DOMAIN: ${domainHint}\n` : ''
        });
    }

    /**
     * Check if file should be skipped
     * @param {string} path - File path
     * @param {string} content - File content
     * @returns {Object} Skip check result
     */
    shouldSkipFile(path, content) {
        return FileClassifier.shouldSkip(path, content);
    }

    /**
     * Get domain hint for file
     * @param {string} path - File path
     * @param {string} content - File content
     * @returns {string} Domain hint
     */
    getDomainHint(path, content) {
        return FileClassifier.getDomainHint(path, content);
    }

    /**
     * Validate language integrity
     * @param {string} path - File path
     * @param {string} content - File content
     * @returns {Object} Language check result
     */
    validateLanguageIntegrity(path, content) {
        return FileClassifier.validateLanguageIntegrity(path, content);
    }

    /**
     * Get maximum content length for single file
     * @returns {number} Maximum length
     */
    getMaxSingleFileLength() {
        return 3000;
    }

    /**
     * Get maximum content length for batch files
     * @returns {number} Maximum length per file in batch
     */
    getMaxBatchFileLength() {
        return 800;
    }

    /**
     * Format file path for prompt
     * @param {string} path - File path
     * @returns {string} Formatted path
     */
    formatFilePath(path) {
        return path;
    }

    /**
     * Create project context section
     * @param {string} repo - Repository name
     * @param {string} langWarning - Language warning
     * @param {string} domainHint - Domain hint
     * @returns {string} Project context
     */
    createProjectContext(repo, langWarning = '', domainHint = '') {
        const hintLine = domainHint ? `SUGGESTED DOMAIN: ${domainHint}\n` : '';
        return `<project_context>\n${langWarning}${hintLine}Repository: ${repo}\n</project_context>`;
    }
}
