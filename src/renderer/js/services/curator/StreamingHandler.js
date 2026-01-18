/**
 * StreamingHandler - Manages real-time processing and streaming updates
 * Extracted from DeepCurator to comply with SRP
 *
 * Responsibilities:
 * - Accumulate findings in batches
 * - Process streaming repo updates
 * - Build streaming context for identity updates
 * - Execute thematic mappers per-repo (CPU parallelism)
 */
import { DebugLogger } from '../../utils/debugLogger.js';
import { CacheRepository } from '../../utils/cacheRepository.js';
import { MetricRefinery } from './MetricRefinery.js';
import { Logger } from '../../utils/logger.js';
import { ThematicMapper } from './ThematicMapper.js';

export class StreamingHandler {
    constructor() {
        // Internal state for streaming accumulation
        this.accumulatedFindings = [];
        this.traceabilityMap = {};

        this.ticks = {
            compaction: 0,
            blueprints: 0,
            global_refinements: 0,
            analyzed_files: 0
        };
    }

    /**
     * Increment a specific evolution tick
     */
    incrementTick(type) {
        if (this.ticks[type] !== undefined) {
            this.ticks[type]++;
        }
    }

    /**
     * Get current ticks for context injection
     */
    getEvolutionStatus() {
        return {
            ...this.ticks,
            coverage_status: this.ticks.analyzed_files < 10 ? 'INITIAL_SCAN' :
                this.ticks.analyzed_files < 50 ? 'GATHERING_MASS' : 'DEEP_DIVE'
        };
    }

    /**
     * Incrementally processes a batch of findings
     * Used in Streaming Map-Reduce pipeline (Slot 5)
     */
    incorporateBatch(batchFindings) {
        if (!batchFindings || batchFindings.length === 0) return null;

        this.accumulatedFindings.push(...batchFindings);
        this.ticks.analyzed_files += batchFindings.length; // Update analyzed files tick

        // Update traceability map on the fly
        batchFindings.forEach(finding => {
            const domain = finding.classification || 'General';
            if (!this.traceabilityMap[domain]) {
                this.traceabilityMap[domain] = [];
            }
            // Normalize for downstream consumers
            const filePath = finding.file || finding.path || 'unknown';
            const uid = finding.uid || finding.params?.uid || null;

            if (!uid || filePath === 'unknown') {
                // Skip broken references or log them
                return;
            }

            this.traceabilityMap[domain].push({
                uid: uid,
                repo: finding.repo,
                file: filePath,
                summary: finding.summary
            });
        });

        // Return current state snapshot
        return {
            totalFindings: this.accumulatedFindings.length,
            domains: Object.keys(this.traceabilityMap)
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
            repoFindings = this.accumulatedFindings.filter(f => f.repo === repoName);
        }

        if (repoFindings.length === 0) {
            Logger.warn('StreamingHandler', `[STREAMING] Skipped ${repoName} (No findings available yet)`);
            return;
        }

        Logger.info('StreamingHandler', `[STREAMING] Processing repo: ${repoName} (${repoFindings.length} findings)`);

        try {
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

                    // Broadcast context evolution to chat
                    const identity = await CacheRepository.getTechnicalIdentity(username);
                    const { AIService } = await import('../aiService.js');
                    if (identity && AIService.setSessionContext) {
                        AIService.setSessionContext(this._buildSessionContextFromIdentity(identity));
                    }
                }
            }
        } catch (e) {
            Logger.error('StreamingHandler', `Streaming process failed for ${repoName}: ${e.message}`);
        }
    }

    /**
     * Curate findings using the Funnel of Truth
     */
    curateFindings(findings) {
        // This would delegate to InsightsCurator - simplified for now
        const validInsights = findings.filter(f => f && f.summary);
        const stats = {
            repoCount: [...new Set(findings.map(f => f.repo))].length,
            topStrengths: [{ name: 'General', count: validInsights.length }]
        };

        return {
            validInsights,
            anomalies: [],
            stats,
            traceability_map: this.traceabilityMap
        };
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
        const rawFindings = this.accumulatedFindings;
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
        return this.accumulatedFindings;
    }

    /**
     * Get traceability map
     */
    getTraceabilityMap() {
        return this.traceabilityMap;
    }
}
