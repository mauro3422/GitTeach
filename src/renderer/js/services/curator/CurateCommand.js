/**
 * CurateCommand - Command for executing the curation phase
 * Extracts curation logic from SynthesisOrchestrator
 *
 * SOLID Principles:
 * - S: Single responsibility for curation operations
 * - O: Extensible curation strategies
 * - L: Substitutable with other command types
 * - I: Clean command interface
 * - D: Depends on injected dependencies
 */

import { logManager } from '../../utils/logManager.js';

export class CurateCommand {
    constructor(insightsCurator, streamingHandler = null) {
        this.insightsCurator = insightsCurator;
        this.streamingHandler = streamingHandler;
        this.logger = logManager.child({ component: 'CurateCommand' });
    }

    /**
     * Executes the curation command
     * @param {Array} findings - Raw findings to curate
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Curation result
     */
    async execute(findings, options = {}) {
        try {
            this.logger.info(`Starting curation of ${findings.length} findings`);

            if (!findings || findings.length === 0) {
                this.logger.warn('No findings available for curation');
                return this._createEmptyResult();
            }

            // Execute curation logic
            const curationResult = this.insightsCurator.curate(findings);
            const { validInsights, anomalies, stats, traceability_map } = curationResult;

            // Merge with streaming handler traceability if available
            if (this.streamingHandler?.getTraceabilityMap()) {
                this.insightsCurator.mergeTraceabilityMaps(
                    curationResult.traceability_map,
                    this.streamingHandler.getTraceabilityMap()
                );
            }

            this.logger.info(`Curation completed: ${findings.length} -> ${validInsights.length} insights`);
            this.logger.debug(`Diversity: ${stats.repoCount} repos, ${anomalies.length} anomalies detected`);

            if (anomalies.length > 0) {
                this.logger.warn(`${anomalies.length} integrity anomalies detected`);
            }

            return {
                success: true,
                validInsights,
                anomalies,
                stats,
                traceability_map: curationResult.traceability_map,
                metadata: {
                    totalInput: findings.length,
                    totalOutput: validInsights.length,
                    processingTime: Date.now(),
                    command: 'curate'
                }
            };

        } catch (error) {
            this.logger.error(`Curation command failed: ${error.message}`, { error: error.stack });
            return {
                success: false,
                error: error.message,
                validInsights: [],
                anomalies: [],
                stats: { repoCount: 0, topStrengths: [] },
                traceability_map: {},
                metadata: { command: 'curate', error: true }
            };
        }
    }

    /**
     * Creates empty curation result
     * @returns {Object} Empty result structure
     */
    _createEmptyResult() {
        return {
            success: true,
            validInsights: [],
            anomalies: [],
            stats: { repoCount: 0, topStrengths: [] },
            traceability_map: {},
            metadata: {
                totalInput: 0,
                totalOutput: 0,
                processingTime: Date.now(),
                command: 'curate'
            }
        };
    }

    /**
     * Validates command prerequisites
     * @returns {boolean} True if command can execute
     */
    canExecute() {
        return !!this.insightsCurator;
    }

    /**
     * Gets command metadata
     * @returns {Object} Command information
     */
    getMetadata() {
        return {
            name: 'CurateCommand',
            description: 'Curates and filters raw analysis findings',
            version: '1.0.0',
            dependencies: ['InsightsCurator']
        };
    }
}
