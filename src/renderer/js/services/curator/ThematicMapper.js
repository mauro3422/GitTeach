/**
 * ThematicMapper - Orchestrates specialized analysis mappers
 * 
 * Responsibilities:
 * - Delegate technical analysis to Architecture, Habits, and Stack mappers
 * - Execute analysis in parallel for performance
 */
import { logManager } from '../../utils/logManager.js';
import { ArchitectureMapper } from './mappers/ArchitectureMapper.js';
import { HabitsMapper } from './mappers/HabitsMapper.js';
import { StackMapper } from './mappers/StackMapper.js';

export class ThematicMapper {
    constructor() {
        this.logger = logManager.child({ component: 'ThematicMapper' });
        this.architectureMapper = new ArchitectureMapper();
        this.habitsMapper = new HabitsMapper();
        this.stackMapper = new StackMapper();
    }

    /**
     * Execute thematic analysis for all layers IN PARALLEL
     * @param {string} username - GitHub username
     * @param {string} curatedInsightsText - Formatted curated insights
     * @param {Object} healthReport - Grounding metrics
     * @returns {Promise<Object>} Analysis results by layer
     */
    async executeMapping(username, insightsArray, healthReport = null) {
        // SEMANTIC PARTITIONING (Optimization)
        // Instead of truncating a monolithic blob, we divide insights by relevance
        // This ensures each mapper gets 100% of its relevant context.
        const { InsightPartitioner } = await import('./InsightPartitioner.js');
        const partitions = InsightPartitioner.partition(insightsArray);

        this.logger.info(`🔍 SEMANTIC PARTITIONING: Architecture (${partitions.architecture.length}), Habits (${partitions.habits.length}), Stack (${partitions.stack.length})`);

        // DEBUG PERSISTENCE (Tracer only)
        if (typeof window !== 'undefined' && window.cacheAPI?.persistPartitionDebug) {
            await Promise.all([
                window.cacheAPI.persistPartitionDebug('architecture', partitions.architecture),
                window.cacheAPI.persistPartitionDebug('habits', partitions.habits),
                window.cacheAPI.persistPartitionDebug('stack', partitions.stack)
            ]);
        }
        this.logger.info('Executing Parallel Thematic Mapping (Architecture, Habits, Stack)...');

        const startTime = Date.now();
        const results_meta = { start: startTime };

        const [architecture, habits, stack] = await Promise.all([
            (async () => {
                const s = Date.now();
                const res = await this.architectureMapper.map(username, this._formatInsights(partitions.architecture), healthReport);
                res.durationMs = Date.now() - s;
                return res;
            })(),
            (async () => {
                const s = Date.now();
                const res = await this.habitsMapper.map(username, this._formatInsights(partitions.habits), healthReport);
                res.durationMs = Date.now() - s;
                return res;
            })(),
            (async () => {
                const s = Date.now();
                const res = await this.stackMapper.map(username, this._formatInsights(partitions.stack));
                res.durationMs = Date.now() - s;
                return res;
            })()
        ]);

        const totalDuration = Date.now() - startTime;
        this.logger.info(`Thematic Layers completed successfully in ${totalDuration}ms ✅`);

        return {
            architecture,
            habits,
            stack,
            performance: {
                totalMs: totalDuration,
                layers: {
                    architecture: architecture.durationMs,
                    habits: habits.durationMs,
                    stack: stack.durationMs
                }
            }
        };
    }

    _formatInsights(insights) {
        if (!insights || insights.length === 0) return "No specific insights found for this layer.";

        return insights.map(f => {
            const repoTag = f.repo ? `[${f.repo}] ` : '';
            // INJECT UID for Traceability (The Golden Thread)
            return `### ${repoTag}${f.summary} [UID:${f.uid}]`;
        }).join('\n\n');
    }

    /**
     * Format results for consumption by DNASynthesizer
     * @param {Object} results - Raw mapper results
     * @returns {Object} Formatted object of results
     */
    formatForSynthesis(results) {
        return {
            architecture: results.architecture || { analysis: 'No architecture analysis', evidence_uids: [] },
            habits: results.habits || { analysis: 'No habits analysis', evidence_uids: [] },
            stack: results.stack || { analysis: 'No stack analysis', evidence_uids: [] },
            performance: results.performance || { totalMs: 0, layers: {} }
        };
    }
}
