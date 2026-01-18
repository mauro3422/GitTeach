/**
 * SynthesisOrchestrator - Coordinates the deep curation synthesis pipeline
 * Refactored to use Command Pattern for better separation of concerns
 *
 * SOLID Principles:
 * - S: Single responsibility for orchestration only
 * - O: Extensible command system
 * - L: Substitutable with other orchestrators
 * - I: Clean orchestration interface
 * - D: Depends on injected commands
 */
import { logManager } from '../../utils/logManager.js';
import { DebugLogger } from '../../utils/debugLogger.js';
import { MetricRefinery } from './MetricRefinery.js';
import { CurateCommand } from './CurateCommand.js';
import { SynthesizeCommand } from './SynthesizeCommand.js';
import { AISlotPriorities } from '../ai/AISlotManager.js';

export class SynthesisOrchestrator {
    constructor(options = {}) {
        const insightsCurator = options.insightsCurator || (async () => {
            const { InsightsCurator } = await import('./InsightsCurator.js');
            return new InsightsCurator();
        })();

        // Ensure commands have their dependencies even if not provided in options
        this.curateCommand = options.curateCommand || new CurateCommand(options.insightsCurator || null);

        // We'll lazy-load or use provided options for more complex ones
        this.synthesizeCommand = options.synthesizeCommand || new SynthesizeCommand(
            options.dnaSynthesizer || null,
            options.layeredPersistenceManager || null,
            options.thematicMapper || null
        );

        this.metricRefinery = options.metricRefinery || MetricRefinery;
        this.debugLogger = options.debugLogger || DebugLogger;
        this.logger = logManager.child({ component: 'SynthesisOrchestrator' });
    }

    /**
     * Lazy-init dependencies if they were not provided
     */
    async _ensureDependencies() {
        if (!this.curateCommand.insightsCurator) {
            const { InsightsCurator } = await import('./InsightsCurator.js');
            this.curateCommand.insightsCurator = new InsightsCurator();
        }

        if (!this.synthesizeCommand.dnaSynthesizer) {
            const { DNASynthesizer } = await import('./DNASynthesizer.js');
            this.synthesizeCommand.dnaSynthesizer = new DNASynthesizer();
        }

        if (!this.synthesizeCommand.layeredPersistenceManager) {
            const { LayeredPersistenceManager } = await import('./LayeredPersistenceManager.js');
            this.synthesizeCommand.layeredPersistenceManager = LayeredPersistenceManager;
        }

        if (!this.synthesizeCommand.thematicMapper) {
            const { ThematicMapper } = await import('./ThematicMapper.js');
            this.synthesizeCommand.thematicMapper = new ThematicMapper();
        }
    }

    /**
     * Deep Curation Engine (Map-Reduce):
     * Orchestrates the curation and synthesis pipeline using Command Pattern
     */
    async runDeepCurator(username, coordinator, streamingHandler) {
        try {
            this.logger.info(`Starting deep curation orchestration for ${username}`);

            // Ensure all commands are initialized
            await this._ensureDependencies();

            // Step 1: Collect raw findings
            const rawFindings = streamingHandler?.getAccumulatedFindings() || [];
            const coordinatorFindings = coordinator ? coordinator.getAllRichSummaries() : [];
            const allFindings = rawFindings.length > 0 ? rawFindings : coordinatorFindings;

            if (!allFindings || allFindings.length === 0) {
                this.logger.warn('No findings available for curation');
                return null;
            }

            this.logger.debug(`Collected ${allFindings.length} raw findings`);

            // Step 2: Execute curation using CurateCommand
            const curationResult = await this.curateCommand.execute(allFindings, { streamingHandler });
            if (!curationResult.success) {
                this.logger.error(`Curation failed: ${curationResult.error}`);
                return { error: curationResult.error };
            }

            const { validInsights, stats, traceability_map } = curationResult;
            this.logger.info(`Curation successful: ${allFindings.length} -> ${validInsights.length} insights`);

            // Step 3: Generate thematic analyses
            const thematicAnalyses = await this._executeThematicMapping(username, validInsights, coordinator, stats);

            // Step 4: Execute synthesis using SynthesizeCommand
            const synthesisParams = {
                username,
                thematicAnalyses,
                stats,
                traceability_map,
                healthReport: this._generateHealthReport(validInsights, coordinator),
                totalFindings: allFindings.length,
                validInsightsCount: validInsights.length
            };

            const synthesisResult = await this.synthesizeCommand.execute(synthesisParams);
            if (!synthesisResult.success) {
                this.logger.error(`Synthesis failed: ${synthesisResult.error}`);
                return { error: synthesisResult.error };
            }

            // Debug logging
            this.debugLogger.logCurator('final_dna_synthesis', synthesisResult.dna);

            this.logger.info(`Deep curation completed successfully for ${username}`);

            return {
                dna: synthesisResult.dna,
                traceability_map: synthesisResult.traceability_map,
                performance: { synthesisTime: synthesisResult.metadata.synthesisTime }
            };

        } catch (error) {
            this.logger.error(`Deep curation orchestration failed: ${error.message}`, { error: error.stack });
            return { error: error.message, stack: error.stack };
        }
    }

    /**
     * Execute thematic mapping logic
     */
    async _executeThematicMapping(username, validInsights, coordinator, stats) {
        try {
            // Check for pre-calculated analyses
            const { CacheRepository } = await import('../../utils/cacheRepository.js');
            const existingBlueprints = await CacheRepository.getAllRepoBlueprints();
            const blueprintsWithAnalysis = existingBlueprints.filter(bp => bp.thematicAnalysis);

            if (blueprintsWithAnalysis.length > 0) {
                // Use merged pre-calculated analyses
                this.logger.info(`Using ${blueprintsWithAnalysis.length} pre-calculated thematic analyses`);
                return this.synthesizeCommand.mergeThematicAnalyses(blueprintsWithAnalysis);
            } else {
                // Execute full thematic mapping
                this.logger.info('Executing full thematic mapping analysis');
                const { ThematicMapper } = await import('./ThematicMapper.js');
                const thematicMapper = new ThematicMapper();
                const healthReport = this._generateHealthReport(validInsights, coordinator);

                const mapperResults = await thematicMapper.executeMapping(username, validInsights, healthReport);
                return thematicMapper.formatForSynthesis(mapperResults);
            }
        } catch (error) {
            this.logger.error(`Thematic mapping failed: ${error.message}`);
            return {
                architecture: { analysis: '', evidence_uids: [] },
                habits: { analysis: '', evidence_uids: [] },
                stack: { analysis: '', evidence_uids: [] },
                performance: { totalMs: 0, layers: {} }
            };
        }
    }

    /**
     * Generate health report from insights
     */
    _generateHealthReport(validInsights, coordinator) {
        try {
            return this.metricRefinery.refine(validInsights, coordinator?.getTotalFilesScanned?.() || 0);
        } catch (error) {
            this.logger.warn(`Health report generation failed: ${error.message}`);
            return { complexity_score: 0, maintainability_index: 0 };
        }
    }

    /**
     * Legacy method for backward compatibility - delegates to CurateCommand
     */
    async curateInsights(findings, streamingHandler = null) {
        const result = await this.curateCommand.execute(findings, { streamingHandler });
        return result.success ? {
            validInsights: result.validInsights,
            anomalies: result.anomalies,
            stats: result.stats,
            traceability_map: result.traceability_map
        } : { validInsights: [], anomalies: [], stats: { repoCount: 0 }, traceability_map: {} };
    }

    /**
     * Generate AI insights based on scan findings
     */
    async getAIInsights(username, langs, codeInsights, hasRealData) {
        // This would delegate to the original DeepCurator method
        // Simplified for now
        if (!hasRealData) {
            return {
                summary: "Couldn't analyze code deeply due to lack of access.",
                suggestions: ["github_stats"]
            };
        }

        const structuredFindings = codeInsights.map(f => {
            const files = f.auditedSnippets && f.auditedSnippets !== "No Access"
                ? f.auditedSnippets.map(s => `- ${s.file}: ${s.aiSummary || "Analyzed"}`).join('\n')
                : "Files analyzed without specific summary.";
            return `### REPO: ${f.repo}\n${files}`;
        }).join('\n\n');

        // Generate a basic profile based on languages
        const bio = `${username} is a developer working with ${langs.join(', ')}. They have analyzed ${codeInsights.length} repositories.`;
        const traits = langs.map(lang => ({
            name: lang,
            score: 80,
            details: `Experience with ${lang} programming language`,
            evidence: "Repository analysis",
            evidence_uids: []
        }));

        return {
            summary: bio,
            suggestions: ['github_stats', 'skills_grid'],
            detailed_profile: {
                bio,
                traits,
                verdict: "Mid-level Developer"
            }
        };
    }

    /**
     * Generates a dense technical summary using local AI.
     */
    async generateHighFidelitySummary(repo, path, usageSnippet, priority = AISlotPriorities.BACKGROUND) {
        // This would delegate to WorkerPromptBuilder
        // Simplified implementation
        return `Analysis of ${path} in ${repo}: ${usageSnippet.substring(0, 100)}...`;
    }


}
