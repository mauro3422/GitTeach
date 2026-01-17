/**
 * WorkerPromptBuilder - Coordinator/Facade for AI code analysis prompt building
 * Complies with SRP by delegating to specialized modules
 *
 * Responsibilities:
 * - Coordinate between specialized prompt building modules
 * - Provide unified interface for prompt generation
 * - Maintain backward compatibility
 */
import { SystemPromptBuilder } from './SystemPromptBuilder.js';
import { UserPromptBuilder } from './UserPromptBuilder.js';
import { PromptTemplateManager } from './PromptTemplateManager.js';
import { ResponseParser } from './ResponseParser.js';

export class WorkerPromptBuilder {
    constructor() {
        // Initialize specialized modules
        this.systemBuilder = new SystemPromptBuilder();
        this.userBuilder = new UserPromptBuilder();
        this.templateManager = new PromptTemplateManager();
        this.responseParser = new ResponseParser();
    }

    /**
     * Build the system prompt for code analysis
     * @returns {string} Complete system prompt
     */
    buildSystemPrompt() {
        return this.systemBuilder.buildSystemPrompt();
    }

    /**
     * Build the user prompt for a file or batch
     * @param {Object} input - Single item or batch object
     * @returns {Object} { prompt: string, skipReason: string|null }
     */
    buildUserPrompt(input) {
        return this.userBuilder.buildUserPrompt(input);
    }

    /**
     * Get JSON Schema for validation (LFM2 Optimization)
     * @returns {Object} Response schema
     */
    getResponseSchema() {
        return this.templateManager.getResponseSchema();
    }

    /**
     * Parse AI response into structured data
     * @param {string} summary - Raw AI response
     * @param {string} filePath - Path of the file being analyzed
     * @returns {Object|null} Parsed data or null
     */
    parseResponse(summary, filePath = null) {
        return this.responseParser.parseResponse(summary, filePath);
    }

    /**
     * Post-process summary with anomaly tagging
     * @param {string} summary - AI response
     * @param {Object} langCheck - Language integrity check result
     * @returns {string} Processed summary
     */
    postProcessSummary(summary, langCheck) {
        return this.responseParser.postProcessSummary(summary, langCheck);
    }

    /**
     * Check if response indicates file should be skipped
     * @param {string} response - Raw response
     * @returns {boolean} True if should skip
     */
    shouldSkip(response) {
        return this.responseParser.shouldSkip(response);
    }

    /**
     * Extract domain from response text
     * @param {string} text - Response text
     * @returns {string|null} Extracted domain or null
     */
    extractDomain(text) {
        return this.responseParser.extractDomain(text);
    }

    /**
     * Extract summary from response text
     * @param {string} text - Response text
     * @returns {string|null} Extracted summary or null
     */
    extractSummary(text) {
        return this.responseParser.extractSummary(text);
    }

    /**
     * Validate parsed response structure
     * @param {Object} response - Parsed response
     * @returns {boolean} True if valid
     */
    validateResponse(response) {
        return this.responseParser.validateResponse(response);
    }

    /**
     * Get default metrics structure
     * @returns {Object} Default metrics
     */
    getDefaultMetrics() {
        return this.responseParser.getDefaultMetrics();
    }

    /**
     * Get default knowledge structure
     * @returns {Object} Default knowledge
     */
    getDefaultKnowledge() {
        return this.responseParser.getDefaultKnowledge();
    }

    /**
     * Get default signals structure
     * @returns {Object} Default signals
     */
    getDefaultSignals() {
        return this.responseParser.getDefaultSignals();
    }
}
