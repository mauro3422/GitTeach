/**
 * GlobalIdentityUpdater - Manages global technical identity updates
 * Extracted from DeepCurator to comply with SRP
 * REFACTORED: Now fully integrated with RepoBlueprintSynthesizer
 */
import { Logger } from '../../utils/logger.js';
import { CacheRepository } from '../../utils/cacheRepository.js';
import { DNASynthesizer } from './DNASynthesizer.js';
import { HolisticSynthesizer } from './HolisticSynthesizer.js';
import { RepoBlueprintSynthesizer } from './RepoBlueprintSynthesizer.js';
import { DebugLogger } from '../../utils/debugLogger.js';

export class GlobalIdentityUpdater {
    constructor(debugLogger = null) {
        this.debugLogger = debugLogger || DebugLogger;
        this.dnaSynthesizer = new DNASynthesizer();
        this.holisticSynthesizer = new HolisticSynthesizer();
        this.blueprintSynthesizer = new RepoBlueprintSynthesizer();
        this.isRefining = false; // Mutex lock
    }

    /**
     * Internal: Re-calculates and persists the Global Identity based on current blueprints
     * PROTECTED: Prevents race conditions during fast streaming updates
     */
    async refineGlobalIdentity(username, ctx) {
        if (this.isRefining) {
            Logger.info('GlobalIdentityUpdater', '[MUTEX] Skipping refinement: Another update is in progress');
            return;
        }

        this.isRefining = true;
        const startTime = Date.now();
        try {
            // 1. Fetch History + New State
            const allBlueprints = await CacheRepository.getAllRepoBlueprints() || [];
            if (allBlueprints.length === 0) return;

            // 2. Calculate Holistic Metrics
            const holisticMetrics = this.holisticSynthesizer.synthesize(allBlueprints);

            // 3. Synthesize Updated Global DNA
            const { dna } = await this.dnaSynthesizer.synthesize(
                username,
                ctx.thematicAnalyses,
                ctx.stats,
                ctx.traceability_map,
                ctx.rawCount,
                ctx.curatedCount,
                ctx.healthReport,
                holisticMetrics
            );

            // 4. Persist immediately (Streaming Update)
            if (dna) {
                await CacheRepository.setTechnicalIdentity(username, dna);
                Logger.reducer(`[STREAMING] Global Identity updated. Versatility: ${holisticMetrics.versatility_index} | Blueprints: ${allBlueprints.length}`);

                const durationMs = Date.now() - startTime;

                // STREAMING LOG: Validated by User (2026-01-16)
                await this.debugLogger.logContextEvolution({
                    phase: ctx.rawCount < 100 ? 'PARTIAL_STREAMING' : 'FINAL_SYNTHESIS',
                    repoCount: allBlueprints.length,
                    fileCount: ctx.rawCount,
                    durationMs: durationMs,
                    metrics: {
                        versatility: holisticMetrics.versatility_index,
                        evolution_rate: holisticMetrics.evolution_rate
                    },
                    topTraits: dna.traits ? dna.traits.slice(0, 3).map(t => `${t.name}:${t.score}`) : [],
                    bio_snippet: dna.bio ? dna.bio.substring(0, 50) + "..." : "N/A"
                });
            }
        } catch (e) {
            Logger.error('GlobalIdentityUpdater', `Streaming update failed: ${e.message}`);
        } finally {
            this.isRefining = false;
        }
    }

    /**
     * Generate and persist individual repository blueprints
     */
    async generateRepoBlueprints(username, allFindings, globalContext = null) {
        Logger.info('GlobalIdentityUpdater', 'Synthesizing individual Repository Blueprints...');

        const reposMap = new Map();
        allFindings.forEach(f => {
            if (!reposMap.has(f.repo)) reposMap.set(f.repo, []);
            reposMap.get(f.repo).push(f);
        });

        const generatedBlueprints = [];

        const blueprintPromises = Array.from(reposMap.entries()).map(async ([repoName, findings]) => {
            // 1. Curate findings for THIS repo (local deduplication)
            const curation = this.curateFindings(findings);

            // 2. Synthesize Blueprint
            // IMPORTANT PROMPT FIX: Pass 'findings' (raw) as 3rd arg for MetricRefinery churn calc
            const blueprint = await this.synthesizeBlueprint(repoName, curation.validInsights, findings);

            // 3. Persist
            if (blueprint) {
                generatedBlueprints.push(blueprint);
                Logger.reducer(`[${repoName}] Blueprint generated. Complexity: ${blueprint.metrics.complexity}`);
                await CacheRepository.persistRepoBlueprint(repoName, blueprint);

                // REPO-LEVEL PARTITIONING (Traceability)
                // Save the split insights inside the repo folder for debugging/lineage
                try {
                    const { InsightPartitioner } = await import('./InsightPartitioner.js');
                    const repoPartitions = InsightPartitioner.partition(curation.validInsights);
                    await CacheRepository.persistRepoPartitions(repoName, repoPartitions);
                } catch (e) {
                    console.warn(`[GlobalIdentityUpdater] Partition save failed for ${repoName}:`, e);
                }

                // STREAMING HOOK: Update Global Identity immediately!
                if (globalContext) {
                    await this.refineGlobalIdentity(username, globalContext);
                }
            }
        });

        await Promise.all(blueprintPromises);
        return generatedBlueprints;
    }

    /**
     * Curate findings for a repository
     */
    curateFindings(findings) {
        // Simplified curation - would delegate to InsightsCurator
        const validInsights = findings.filter(f => f && f.summary);
        const stats = {
            repoCount: 1,
            topStrengths: [{ name: 'General', count: validInsights.length }]
        };

        return {
            validInsights,
            anomalies: [],
            stats,
            traceability_map: {}
        };
    }

    /**
     * Synthesize a blueprint from insights
     * Delegates to the real RepoBlueprintSynthesizer
     */
    async synthesizeBlueprint(repoName, validInsights, rawFindings = []) {
        return await this.blueprintSynthesizer.synthesize(repoName, validInsights, rawFindings);
    }

    /**
     * Get current holistic metrics
     */
    async getHolisticMetrics() {
        const allBlueprints = await CacheRepository.getAllRepoBlueprints() || [];
        return this.holisticSynthesizer.synthesize(allBlueprints);
    }

    /**
     * Check if identity update is needed
     */
    async needsIdentityUpdate(username, threshold = 2) {
        const allBlueprints = await CacheRepository.getAllRepoBlueprints() || [];
        const decentRepos = allBlueprints.filter(bp => bp.volume && bp.volume.analyzedFiles > 2).length;
        return decentRepos >= threshold;
    }
}
