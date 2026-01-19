/**
 * StreamingHandler - Manages real-time processing and streaming updates
 * Refactored to use SOLID composition: EvolutionState, EvidenceStore.
 *
 * SOLID Principles:
 * - S: Orchestrates streaming operations using specialized modules
 * - O: Extensible via module composition
 * - L: N/A
 * - I: Clean interface for streaming operations
 * - D: Depends on injected modules for state management
 */
import { DebugLogger } from '../../utils/debugLogger.js';
import { CacheRepository } from '../../utils/cacheRepository.js';
import { MetricRefinery } from './MetricRefinery.js';
import { Logger } from '../../utils/logger.js';
import { ThematicMapper } from './ThematicMapper.js';
import { EvolutionState } from './EvolutionState.js';
import { EvidenceStore } from './EvidenceStore.js';
import { InsightsCurator } from './InsightsCurator.js';

export class StreamingHandler {
    constructor() {
        // Compose specialized modules
        this.evolutionState = new EvolutionState();
        this.evidenceStore = new EvidenceStore();
        this.insightsCurator = new InsightsCurator();
    }

    /**
     * Increment a specific evolution tick
     */
    incrementTick(type) {
        // Map legacy tick types to EvolutionState
        const tickMap = {
            compaction: 'compaction',
            blueprints: 'blueprints',
            global_refinements: 'refinements',
            analyzed_files: 'files'
        };

        if (tickMap[type]) {
            this.evolutionState.updateMetrics({ [tickMap[type]]: this.evolutionState.getStatus().metrics[tickMap[type]] + 1 });
        }
    }

    /**
     * Get current ticks for context injection
     */
    getEvolutionStatus() {
        const status = this.evolutionState.getStatus();
        const files = status.metrics.files || 0;
        return {
            compaction: status.metrics.compaction || 0,
            blueprints: status.metrics.blueprints || 0,
            global_refinements: status.metrics.refinements || 0,
            analyzed_files: files,
            coverage_status: files < 10 ? 'INITIAL_SCAN' :
                files < 50 ? 'GATHERING_MASS' : 'DEEP_DIVE'
        };
    }

    /**
     * Incrementally processes a batch of findings
     * Used in Streaming Map-Reduce pipeline (Slot 5)
     */
    incorporateBatch(batchFindings) {
        if (!batchFindings || batchFindings.length === 0) return null;

        // Delegate to EvidenceStore
        this.evidenceStore.accumulateFindings(batchFindings);

        // Update evolution metrics
        this.evolutionState.updateMetrics({
            files: this.evolutionState.getStatus().metrics.files + batchFindings.length
        });

        // Return current state snapshot
        const stats = this.evidenceStore.getStats();
        return {
            totalFindings: stats.totalFindings,
            domains: Object.keys(this.evidenceStore.getTraceabilityMap())
        };
    }

    /**
     * STREAMING API: Process a single repo immediately after scanning
     */
    async processStreamingRepo(username, repoName, coordinator, isPartial = false, identityUpdater = null) {
        // 1. Fetch findings (Prefer Coordinator as it has real-time state, bypassing WorkerPool buffer)
        let repoFindings = [];
        if (coordinator) {
            repoFindings = coordinator.getAllRichSummaries().filter(f => f.repo === repoName);
        }

        // Fallback to internal state
        if (repoFindings.length === 0) {
            repoFindings = this.evidenceStore.getAccumulatedFindings().filter(f => f.repo === repoName);
        }

        if (repoFindings.length === 0) {
            Logger.warn('StreamingHandler', `[STREAMING] Skipped ${repoName} (No findings available yet)`);
            return;
        }

        Logger.info('StreamingHandler', `[STREAMING] Processing repo: ${repoName} (${repoFindings.length} findings)`);

        try {
            const { pipelineEventBus } = await import('../pipeline/PipelineEventBus.js');
            pipelineEventBus.emit('streaming:active', { repo: repoName, status: 'start' });

            // 2. Curate & Synthesize Blueprint (Local)
            // Use the provided identityUpdater (from DeepCurator) or a fallback logic
            const curation = identityUpdater ? identityUpdater.curateFindings(repoFindings) : this.curateFindings(repoFindings);
            const blueprint = await this.synthesizeBlueprint(username, repoName, curation.validInsights);

            if (blueprint) {
                this.incrementTick('blueprints');
                Logger.reducer(`[${repoName}] Blueprint generated (Streaming). Complexity: ${blueprint.metrics.logic?.modularity || 'N/A'}`);
                await CacheRepository.persistRepoBlueprint(repoName, blueprint);

                // GATEKEEPER IMPLEMENTATION (Optimization)
                // Only refine Global Identity if "Critical Mass" is reached
                const allBlueprints = await CacheRepository.getAllRepoBlueprints();
                const decentRepos = allBlueprints.filter(bp => bp.volume && bp.volume.analyzedFiles > 2).length;
                const richRepos = allBlueprints.filter(bp => bp.volume && bp.volume.analyzedFiles >= 5).length;

                const criticalMassReached = richRepos >= 1 || decentRepos >= 2;

                if (!criticalMassReached) {
                    Logger.info('StreamingHandler', `Global Synthesis Skipped (Gatekeeper: ${decentRepos} decent, ${richRepos} rich repos)`);
                } else if (identityUpdater) {
                    // 3. Update Global Identity (Incremental)
                    Logger.info('StreamingHandler', `Critical mass reached! Updating Global Identity...`);
                    const ctx = await this._buildStreamingContext();
                    await identityUpdater.refineGlobalIdentity(username, ctx);
                    this.incrementTick('global_refinements');

                    const { pipelineEventBus } = await import('../pipeline/PipelineEventBus.js');
                    pipelineEventBus.emit('streaming:active', { repo: repoName, status: 'end' });

                    // Broadcast context evolution to chat
                    const identity = await CacheRepository.getTechnicalIdentity(username);
                    const { AIService } = await import('../aiService.js');
                    if (identity && AIService.setSessionContext) {
                        AIService.setSessionContext(this._buildSessionContextFromIdentity(identity));
                    }
                }
            }
        } catch (e) {
            import('../pipeline/PipelineEventBus.js').then(({ pipelineEventBus }) => {
                pipelineEventBus.emit('streaming:error', { repo: repoName, error: e.message });
            });
            Logger.error('StreamingHandler', `Streaming process failed for ${repoName}: ${e.message}`);
        }
    }

    /**
     * Curate findings using the Funnel of Truth
     */
    curateFindings(findings) {
        // Delegate to InsightsCurator for centralized curation logic
        const curationResult = this.insightsCurator.curate(findings);

        // Merge with existing traceability map from EvidenceStore
        this.insightsCurator.mergeTraceabilityMaps(
            curationResult.traceability_map,
            this.evidenceStore.getTraceabilityMap()
        );

        return curationResult;
    }

    async synthesizeBlueprint(username, repoName, validInsights) {
        // Delegate to the specialized synthesizer (Centralized V4 logic)
        const { RepoBlueprintSynthesizer } = await import('./RepoBlueprintSynthesizer.js');
        const synthesizer = new RepoBlueprintSynthesizer();
        return await synthesizer.synthesize(repoName, validInsights);
    }

    /**
     * Helper to build a REAL context for streaming updates using cached blueprints
     * NO MORE PLACEHOLDERS - uses actual thematic analysis from completed repos
     */
    async _buildStreamingContext() {
        const rawFindings = this.evidenceStore.getAccumulatedFindings();
        const curationResult = this.curateFindings(rawFindings);

        // REAL DATA: Get all blueprints with their thematic analyses
        const layers = {
            architecture: { analysis: '', evidence_uids: [] },
            habits: { analysis: '', evidence_uids: [] },
            stack: { analysis: '', evidence_uids: [] }
        };

        try {
            const allBlueprints = await CacheRepository.getAllRepoBlueprints();
            allBlueprints.filter(bp => bp.thematicAnalysis).forEach(bp => {
                const ta = bp.thematicAnalysis;
                if (ta.architecture?.analysis) {
                    layers.architecture.analysis += `\n### [${bp.repoName}]\n${ta.architecture.analysis}`;
                    layers.architecture.evidence_uids.push(...(ta.architecture.evidence_uids || []));
                }
                if (ta.habits?.analysis) {
                    layers.habits.analysis += `\n### [${bp.repoName}]\n${ta.habits.analysis}`;
                    layers.habits.evidence_uids.push(...(ta.habits.evidence_uids || []));
                }
                if (ta.stack?.analysis) {
                    layers.stack.analysis += `\n### [${bp.repoName}]\n${ta.stack.analysis}`;
                    layers.stack.evidence_uids.push(...(ta.stack.evidence_uids || []));
                }
            });

            Logger.info('StreamingHandler', `Built streaming context aggregated from ${allBlueprints.length} blueprints`);
        } catch (e) {
            Logger.warn('StreamingHandler', `Could not aggregate blueprints for context: ${e.message}`);
        }

        // Format for DNASynthesizer (Array of 3 layers)
        const thematicAnalyses = [
            layers.architecture,
            layers.habits,
            layers.stack
        ];

        // Light-weight health report
        const healthReport = MetricRefinery.refine(curationResult.validInsights, 0);

        return {
            thematicAnalyses,
            stats: curationResult.stats,
            traceability_map: curationResult.traceability_map,
            rawCount: rawFindings.length,
            curatedCount: curationResult.validInsights.length,
            healthReport
        };
    }


    /**
     * Build session context from refined identity for chat
     * NOW INCLUDES: Evolution Ticks for system load visibility
     */
    _buildSessionContextFromIdentity(identity) {
        if (!identity) return '';

        const traits = identity.traits?.slice(0, 5).map(t => `- ${t.name}: ${t.score}/10`).join('\n') || '';
        const bio = identity.bio || 'Developer profile in progress...';
        const status = this.getEvolutionStatus();

        return `[SYSTEM LOAD & EVOLUTION STATUS]
- Internal Compactions: ${status.compaction}
- Repo Blueprints: ${status.blueprints}
- Global Refinements: ${status.global_refinements}
- Files Analyzed: ${status.analyzed_files}
- Coverage Phase: ${status.coverage_status}

[CURRENT DEVELOPER PROFILE]
${bio}

[TOP SKILLS]
${traits}

[VERDICT]
${identity.verdict || 'Analysis in progress...'}`;
    }

    /**
     * Get accumulated findings
     */
    getAccumulatedFindings() {
        return this.evidenceStore.getAccumulatedFindings();
    }

    /**
     * Get traceability map
     */
    getTraceabilityMap() {
        return this.evidenceStore.getTraceabilityMap();
    }
}
