/**
 * SynthesizeCommand - Command for executing the synthesis phase
 * Extracts synthesis logic from SynthesisOrchestrator
 *
 * SOLID Principles:
 * - S: Single responsibility for synthesis operations
 * - O: Extensible synthesis strategies
 * - L: Substitutable with other command types
 * - I: Clean command interface
 * - D: Depends on injected dependencies
 */

import { logManager } from '../../utils/logManager.js';

export class SynthesizeCommand {
    constructor(dnaSynthesizer, layeredPersistenceManager, thematicMapper = null) {
        this.dnaSynthesizer = dnaSynthesizer;
        this.layeredPersistenceManager = layeredPersistenceManager;
        this.thematicMapper = thematicMapper;
        this.logger = logManager.child({ component: 'SynthesizeCommand' });
    }

    /**
     * Executes the synthesis command
     * @param {Object} params - Synthesis parameters
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Synthesis result
     */
    async execute(params, options = {}) {
        const { username, thematicAnalyses, stats, traceability_map, healthReport, totalFindings, validInsightsCount } = params;

        try {
            this.logger.info(`Starting DNA synthesis for ${username}`);

            if (!thematicAnalyses || !this.dnaSynthesizer) {
                throw new Error('Invalid synthesis parameters or missing DNA synthesizer');
            }

            // Execute DNA synthesis
            const { dna, traceability_map: finalMap } = await this.dnaSynthesizer.synthesize(
                username,
                thematicAnalyses,
                stats,
                traceability_map,
                totalFindings,
                validInsightsCount,
                healthReport
            );

            // Store identity broker
            await this.layeredPersistenceManager.storeIdentityBroker(username, dna);

            // Store thematic layers if available
            if (thematicAnalyses.architecture) {
                await this.layeredPersistenceManager.storeLayer(username, 'theme', 'architecture', thematicAnalyses.architecture);
            }
            if (thematicAnalyses.habits) {
                await this.layeredPersistenceManager.storeLayer(username, 'theme', 'habits', thematicAnalyses.habits);
            }
            if (thematicAnalyses.stack) {
                await this.layeredPersistenceManager.storeLayer(username, 'theme', 'stack', thematicAnalyses.stack);
            }
            if (healthReport) {
                await this.layeredPersistenceManager.storeLayer(username, 'metrics', 'health', healthReport);
            }

            this.logger.info(`DNA synthesis completed for ${username}`);
            this.logger.debug(`DNA contains ${Object.keys(dna).length} main sections`);

            return {
                success: true,
                dna,
                traceability_map: finalMap,
                metadata: {
                    username,
                    synthesisTime: Date.now(),
                    totalFindings,
                    validInsightsCount,
                    command: 'synthesize'
                }
            };

        } catch (error) {
            this.logger.error(`Synthesis command failed: ${error.message}`, {
                username,
                error: error.stack,
                params: { totalFindings, validInsightsCount }
            });

            return {
                success: false,
                error: error.message,
                dna: null,
                traceability_map: {},
                metadata: {
                    username,
                    command: 'synthesize',
                    error: true,
                    synthesisTime: Date.now()
                }
            };
        }
    }

    /**
     * Merges pre-calculated thematic analyses
     * @param {Array} blueprints - Blueprints with thematic analysis
     * @returns {Object} Merged thematic results
     */
    mergeThematicAnalyses(blueprints) {
        try {
            this.logger.debug(`Merging thematic analyses from ${blueprints.length} blueprints`);

            const merged = {
                architecture: { analysis: '', evidence_uids: [] },
                habits: { analysis: '', evidence_uids: [] },
                stack: { analysis: '', evidence_uids: [] },
                performance: { totalMs: 0, layers: {} }
            };

            blueprints.forEach(bp => {
                if (!bp.thematicAnalysis) return;

                const ta = bp.thematicAnalysis;

                // Merge architecture
                if (ta.architecture?.analysis) {
                    merged.architecture.analysis += `\n### [${bp.repoName}]\n${ta.architecture.analysis}`;
                    merged.architecture.evidence_uids.push(...(ta.architecture.evidence_uids || []));
                }

                // Merge habits
                if (ta.habits?.analysis) {
                    merged.habits.analysis += `\n### [${bp.repoName}]\n${ta.habits.analysis}`;
                    merged.habits.evidence_uids.push(...(ta.habits.evidence_uids || []));
                }

                // Merge stack
                if (ta.stack?.analysis) {
                    merged.stack.analysis += `\n### [${bp.repoName}]\n${ta.stack.analysis}`;
                    merged.stack.evidence_uids.push(...(ta.stack.evidence_uids || []));
                }

                // Sum performance
                if (ta.performance?.totalMs) {
                    merged.performance.totalMs += ta.performance.totalMs;
                }
            });

            this.logger.debug(`Merged analyses: Arch=${merged.architecture.evidence_uids.length} UIDs, Habits=${merged.habits.evidence_uids.length} UIDs, Stack=${merged.stack.evidence_uids.length} UIDs`);

            return merged;

        } catch (error) {
            this.logger.error(`Error merging thematic analyses: ${error.message}`);
            return {
                architecture: { analysis: '', evidence_uids: [] },
                habits: { analysis: '', evidence_uids: [] },
                stack: { analysis: '', evidence_uids: [] },
                performance: { totalMs: 0, layers: {} }
            };
        }
    }

    /**
     * Validates command prerequisites
     * @returns {boolean} True if command can execute
     */
    canExecute() {
        return !!(this.dnaSynthesizer && this.layeredPersistenceManager);
    }

    /**
     * Gets command metadata
     * @returns {Object} Command information
     */
    getMetadata() {
        return {
            name: 'SynthesizeCommand',
            description: 'Synthesizes technical DNA from thematic analyses',
            version: '1.0.0',
            dependencies: ['DNASynthesizer', 'LayeredPersistenceManager']
        };
    }
}
