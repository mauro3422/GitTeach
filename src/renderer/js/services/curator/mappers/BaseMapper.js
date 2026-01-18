/**
 * BaseMapper - Abstract base class for all thematic mappers
 * Centralizes AI call logic, error handling, and schema validation.
 *
 * SOLID Principles:
 * - S: Handles only the common mechanics of AI mapping
 * - O: Open for extension by specific mapper types
 * - D: Depends on AIService (can be injected)
 */
import { AIService } from '../../aiService.js';
import { logManager } from '../../../utils/logManager.js';

export class BaseMapper {
    constructor(mapperName) {
        this.mapperName = mapperName;
        this.logger = logManager.child({ component: `Mapper:${mapperName}` });
    }

    /**
     * Common mapping execution
     * @param {string} username 
     * @param {string} insights 
     * @param {Object} healthReport 
     * @returns {Promise<Object>}
     */
    async map(username, insights, healthReport = null) {
        const prompt = this.getPrompt(username, healthReport);
        const schema = this.getSchema();

        try {
            this.logger.debug(`Executing ${this.mapperName} analysis (CPU)...`);

            const response = await AIService.callAI_CPU(
                `Mapper: ${this.mapperName}`,
                `${prompt}\n\nINSIGHTS:\n${insights}`,
                0.1,
                'json_object',
                schema
            );

            if (response.error || typeof response === 'string') {
                this.logger.warn(`${this.mapperName} AI returned error or invalid format`, { error: response.error || response });
                return this.getFallback(response.error || response);
            }

            return response;

        } catch (e) {
            this.logger.error(`${this.mapperName} execution failed: ${e.message}`, { error: e.stack });
            return this.getFallback(e.message);
        }
    }

    /**
     * Must be implemented by subclass
     */
    getPrompt(username, healthReport) {
        throw new Error('getPrompt() must be implemented by subclass');
    }

    /**
     * Must be implemented by subclass
     */
    getSchema() {
        throw new Error('getSchema() must be implemented by subclass');
    }

    /**
     * Default fallback if AI fails
     */
    getFallback(errorMsg) {
        return {
            analysis: `${this.mapperName} Analysis Error: ${errorMsg}`,
            evidence_uids: []
        };
    }
}
