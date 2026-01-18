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
        this.thematicMapper = new ThematicMapper();
    }

    /**
     * Incrementally processes a batch of findings
     * Used in Streaming Map-Reduce pipeline (Slot 5)
     */
    incorporateBatch(batchFindings) {
        if (!batchFindings || batchFindings.length === 0) return null;

        this.accumulatedFindings.push(...batchFindings);

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
    async processStreamingRepo(username, repoName, coordinator, isPartial = false) {
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
            console.warn('[StreamingHandler] Skipped ${repoName} (No findings available yet)');
            return;
        }

        console.info('[StreamingHandler] Processing finished repo: ${repoName} (${repoFindings.length} findings)');

        try {
            // 2. Curate & Synthesize Blueprint (Local)
            const curation = this.curateFindings(repoFindings);
            const blueprint = await this.synthesizeBlueprint(username, repoName, curation.validInsights);

            if (blueprint) {
                console.reducer(`[${repoName}] Blueprint generated (Streaming). Complexity: ${blueprint.metrics.complexity}`);
                await CacheRepository.persistRepoBlueprint(repoName, blueprint);

                // GATEKEEPER IMPLEMENTATION (Optimization)
                // Only refine Global Identity if "Critical Mass" is reached
                // IMPROVED: Either 1 repo with 5+ files OR 2 repos with 2+ files
                const allBlueprints = await CacheRepository.getAllRepoBlueprints();
                const decentRepos = allBlueprints.filter(bp => bp.volume && bp.volume.analyzedFiles > 2).length;
                const richRepos = allBlueprints.filter(bp => bp.volume && bp.volume.analyzedFiles >= 5).length;

                const criticalMassReached = richRepos >= 1 || decentRepos >= 2;

                if (!criticalMassReached) {
                    Logger.info('StreamingHandler', `Global Synthesis Skipped (Gatekeeper: ${decentRepos} decent, ${richRepos} rich repos)`);
                } else {
                    // 3. Update Global Identity (Incremental)
                    Logger.info('StreamingHandler', `Critical mass reached! Updating Global Identity...`);
                    const ctx = this._buildStreamingContext();
                    await this.updateGlobalIdentity(username, ctx);
                }
            }
        } catch (e) {
            console.error('[StreamingHandler] Streaming process failed for ${repoName}: ${e.message}');
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

    /**
     * Synthesize a blueprint from curated insights
     * NOW WITH THEMATIC MAPPING (CPU parallelism)
     */
    async synthesizeBlueprint(username, repoName, validInsights) {
        // Base blueprint
        const blueprint = {
            repoName,
            metrics: {
                complexity: validInsights.length,
                patterns: ['streaming']
            },
            volume: {
                analyzedFiles: validInsights.length
            },
            generatedAt: new Date().toISOString()
        };

        // INCREMENTAL MAPPING: If enough insights, run thematic mappers (CPU)
        // Threshold: At least 5 insights to warrant AI analysis
        if (validInsights.length >= 5) {
            try {
                Logger.mapper(`[${repoName}] Running thematic mapping (CPU)...`);
                const mapperResults = await this.thematicMapper.executeMapping(username, validInsights, null);

                // Attach thematic analysis to blueprint
                blueprint.thematicAnalysis = {
                    architecture: mapperResults.architecture,
                    habits: mapperResults.habits,
                    stack: mapperResults.stack,
                    performance: mapperResults.performance
                };

                Logger.mapper(`[${repoName}] Thematic mapping completed in ${mapperResults.performance?.totalMs || '?'}ms`);
            } catch (e) {
                Logger.warn('StreamingHandler', `Thematic mapping failed for ${repoName}: ${e.message}`);
                // Blueprint still valid without thematic analysis
            }
        }

        return blueprint;
    }

    /**
     * Helper to build a partial context for streaming updates
     */
    _buildStreamingContext() {
        const rawFindings = this.accumulatedFindings;
        const curationResult = this.curateFindings(rawFindings);

        // Use placeholder thematic analysis for speed (Wait for Phase 2 for deep analysis)
        const thematicAnalyses = [
            "Analysis in progress (Streaming)...",
            "Analysis in progress (Streaming)...",
            "Analysis in progress (Streaming)..."
        ];

        // Light-weight health report
        const healthReport = MetricRefinery.refine(curationResult.validInsights, 0); // Total files unknown in streaming

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
     * Update global identity with streaming context (INCREMENTAL)
     * This is the key to "hormiga" updates - the user context evolves constantly
     */
    async updateGlobalIdentity(username, ctx) {
        try {
            const { GlobalIdentityRefiner } = await import('./GlobalIdentityRefiner.js');
            const refiner = new GlobalIdentityRefiner();

            Logger.info('StreamingHandler', `Refining global identity for ${username}...`);

            // Refine identity using current context (blueprints + thematic analyses)
            const refinedIdentity = await refiner.refineGlobalIdentity(username, ctx);

            if (refinedIdentity) {
                Logger.mapper(`Global identity updated incrementally (${ctx.curatedCount} insights incorporated)`);

                // Update session context for chat (so chat has fresh data)
                const { AIService } = await import('../aiService.js');
                if (AIService.setSessionContext) {
                    const sessionCtx = this._buildSessionContextFromIdentity(refinedIdentity);
                    AIService.setSessionContext(sessionCtx);
                }
            }
        } catch (e) {
            Logger.warn('StreamingHandler', `Incremental identity update failed: ${e.message}`);
        }
    }

    /**
     * Build session context from refined identity for chat
     */
    _buildSessionContextFromIdentity(identity) {
        if (!identity) return '';

        const traits = identity.traits?.slice(0, 5).map(t => `- ${t.name}: ${t.score}/10`).join('\n') || '';
        const bio = identity.bio || 'Developer profile in progress...';

        return `[CURRENT DEVELOPER PROFILE]
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
