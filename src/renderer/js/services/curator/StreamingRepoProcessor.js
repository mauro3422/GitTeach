/**
 * StreamingRepoProcessor - Handles streaming repository processing
 * Extracted from DeepCurator to comply with SRP
 *
 * Responsibilities:
 * - Process repositories in streaming mode
 * - Coordinate with GlobalIdentityUpdater and BlueprintGenerator
 * - Manage critical mass gatekeeper logic
 * - Build streaming contexts for partial updates
 */

import { Logger } from '../../utils/logger.js';
import { CacheRepository } from '../../utils/cacheRepository.js';

export class StreamingRepoProcessor {
    /**
     * Constructor
     * @param {GlobalIdentityUpdater} identityUpdater - Identity updater service
     * @param {BlueprintGenerator} blueprintGenerator - Blueprint generator service
     */
    constructor(identityUpdater, blueprintGenerator) {
        this.identityUpdater = identityUpdater;
        this.blueprintGenerator = blueprintGenerator;
    }

    /**
     * Process a single repository in streaming mode
     * @param {string} username - GitHub username
     * @param {string} repoName - Repository name
     * @param {Object} coordinator - CoordinatorAgent instance
     * @param {boolean} isPartial - Whether this is a partial update
     * @returns {Promise<void>}
     */
    async processSingleRepo(username, repoName, coordinator, isPartial = false) {
        // 1. Fetch findings (Prefer Coordinator as it has real-time state, bypassing WorkerPool buffer)
        let repoFindings = [];
        if (coordinator) {
            repoFindings = coordinator.getAllRichSummaries().filter(f => f.repo === repoName);
        }

        // Fallback to internal state if coordinator doesn't have findings
        if (repoFindings.length === 0) {
            Logger.warn('StreamingRepoProcessor', `[STREAMING] No findings available for ${repoName} in coordinator`);
            return;
        }

        Logger.info('StreamingRepoProcessor', `[STREAMING] Processing repo: ${repoName} (${repoFindings.length} findings)`);

        try {
            // 2. Curate & Synthesize Blueprint (Local)
            const curation = this.blueprintGenerator.curateFindings(repoFindings);
            const blueprint = await this.blueprintGenerator.synthesizeBlueprint(repoName, curation.validInsights);

            if (blueprint) {
                Logger.reducer(`[${repoName}] Blueprint generated (Streaming). Complexity: ${blueprint.metrics?.complexity || 'Unknown'}`);
                await CacheRepository.persistRepoBlueprint(repoName, blueprint);

                // GATEKEEPER IMPLEMENTATION (Optimization)
                // Only refine Global Identity if "Critical Mass" is reached
                // Rule: At least 2 repos with > 2 analyzed files
                const criticalMassReached = await this.checkCriticalMass();

                if (!criticalMassReached) {
                    Logger.info('StreamingRepoProcessor', `[STREAMING] Global Synthesis Skipped (Gatekeeper: insufficient repos)`);
                } else {
                    // 3. Update Global Identity (Incremental)
                    const ctx = this.buildStreamingContext();
                    await this.identityUpdater.refineGlobalIdentity(username, ctx);
                }
            }
        } catch (e) {
            Logger.error('StreamingRepoProcessor', `Streaming process failed for ${repoName}: ${e.message}`);
        }
    }

    /**
     * Check if critical mass is reached for global identity refinement
     * @returns {Promise<boolean>} Whether critical mass is reached
     */
    async checkCriticalMass() {
        const allBlueprints = await CacheRepository.getAllRepoBlueprints();
        const decentRepos = allBlueprints.filter(bp =>
            bp.volume && bp.volume.analyzedFiles > 2
        ).length;

        Logger.info('StreamingRepoProcessor', `[CRITICAL MASS] ${decentRepos}/2 decent repos available`);
        return decentRepos >= 2;
    }

    /**
     * Build a streaming context for partial updates
     * @returns {Object} Streaming context
     */
    buildStreamingContext() {
        // This would integrate with other streaming components
        // Simplified for initial implementation
        return {
            streamingMode: true,
            partialUpdate: true,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Process streaming batch of repositories
     * @param {string} username - GitHub username
     * @param {Array} repoNames - Array of repository names to process
     * @param {Object} coordinator - CoordinatorAgent instance
     * @returns {Promise<void>}
     */
    async processStreamingBatch(username, repoNames, coordinator) {
        Logger.info('StreamingRepoProcessor', `[BATCH] Processing ${repoNames.length} repos in streaming mode`);

        for (const repoName of repoNames) {
            await this.processSingleRepo(username, repoName, coordinator, false);
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        Logger.info('StreamingRepoProcessor', `[BATCH] Completed streaming batch processing`);
    }

    /**
     * Get streaming statistics
     * @returns {Promise<Object>} Streaming processing statistics
     */
    async getStreamingStats() {
        const allBlueprints = await CacheRepository.getAllRepoBlueprints();
        const streamingBlueprints = allBlueprints.filter(bp => bp.metadata?.streaming === true);

        return {
            totalBlueprints: allBlueprints.length,
            streamingBlueprints: streamingBlueprints.length,
            criticalMassReached: await this.checkCriticalMass(),
            lastUpdate: streamingBlueprints.length > 0 ?
                Math.max(...streamingBlueprints.map(bp => new Date(bp.metadata?.timestamp || 0))) :
                null
        };
    }
}