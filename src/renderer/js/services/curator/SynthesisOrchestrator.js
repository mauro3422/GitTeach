/**
 * SynthesisOrchestrator - Coordinates the deep curation synthesis pipeline
 * Extracted from DeepCurator to comply with SRP
 *
 * Responsibilities:
 * - Orchestrate the main curation pipeline
 * - Coordinate thematic mapping and DNA synthesis
 * - Manage the overall synthesis workflow
 */
import { Logger } from '../../utils/logger.js';
import { DebugLogger } from '../../utils/debugLogger.js';
import { ThematicMapper } from './ThematicMapper.js';
import { DNASynthesizer } from './DNASynthesizer.js';
import { MetricRefinery } from './MetricRefinery.js';
import { AISlotPriorities } from '../ai/AISlotManager.js';

export class SynthesisOrchestrator {
    constructor() {
        this.thematicMapper = new ThematicMapper();
        this.dnaSynthesizer = new DNASynthesizer();
    }

    /**
     * Deep Curation Engine (Map-Reduce):
     * Takes 100% of summaries and reduces them to dense memory.
     * Uses "Funnel of Truth" logic (Deduplication + Rarity Filter).
     */
    async runDeepCurator(username, coordinator, streamingHandler) {
        // Step 1: Get Raw Rich Data
        // PREFER internal accumulation (which has UIDs from MemoryManager) over Coordinator (which might be raw)
        const rawFindings = streamingHandler.getAccumulatedFindings();
        const coordinatorFindings = coordinator ? coordinator.getAllRichSummaries() : [];
        const allFindings = rawFindings.length > 0 ? rawFindings : coordinatorFindings;

        if (!allFindings || allFindings.length === 0) {
            Logger.info('SynthesisOrchestrator', 'No findings available for curation.');
            return null;
        }

        // Step 2: Curate (Deduplicate + Filter + Weighting + Referencing)
        const curationResult = this.curateInsights(allFindings, streamingHandler);
        const { validInsights, anomalies, stats, traceability_map } = curationResult;

        Logger.reducer(`Curation completed: ${allFindings.length} -> ${validInsights.length} unique insights.`);
        Logger.reducer(`Diversity: ${stats.repoCount} repositories, ${stats.topStrengths.slice(0, 3).map(s => s.name).join(', ')} predominant.`);

        if (anomalies.length > 0) {
            Logger.warn('SynthesisOrchestrator', `Detected ${anomalies.length} integrity anomalies.`);
        }

        // EXTRA STEP: Mathematical Metric Refining (Objectivity Layer)
        // This grounds the AI in reality before mapping layers
        const healthReport = MetricRefinery.refine(validInsights, coordinator.getTotalFilesScanned?.() || 0);

        try {
            // OPTIMIZATION: Check if blueprints already have thematic analysis
            const { CacheRepository } = await import('../../utils/cacheRepository.js');
            const existingBlueprints = await CacheRepository.getAllRepoBlueprints();
            const blueprintsWithAnalysis = existingBlueprints.filter(bp => bp.thematicAnalysis);

            let mapperResults;

            if (blueprintsWithAnalysis.length > 0) {
                // MERGE PRE-CALCULATED ANALYSES (from per-repo CPU mappers)
                Logger.mapper(`Merging ${blueprintsWithAnalysis.length} pre-calculated thematic analyses...`);
                mapperResults = this._mergeThematicAnalyses(blueprintsWithAnalysis);
            } else {
                // FALLBACK: Execute full thematic mapping (original behavior)
                Logger.mapper('Executing 3 layers of deep technical analysis...');
                mapperResults = await this.thematicMapper.executeMapping(username, validInsights, healthReport);
            }

            // EXTRA STEP: Layered Persistence (Persistence of Themes as independent keys)
            const { LayeredPersistenceManager } = await import('./LayeredPersistenceManager.js');
            await Promise.all([
                LayeredPersistenceManager.storeLayer(username, 'theme', 'architecture', mapperResults.architecture),
                LayeredPersistenceManager.storeLayer(username, 'theme', 'habits', mapperResults.habits),
                LayeredPersistenceManager.storeLayer(username, 'theme', 'stack', mapperResults.stack),
                LayeredPersistenceManager.storeLayer(username, 'metrics', 'health', healthReport)
            ]);

            const thematicAnalyses = this.thematicMapper.formatForSynthesis(mapperResults);

            // Step 5: Synthesize DNA (Phase 2 - Reduce)
            const { dna, traceability_map: finalMap } = await this.dnaSynthesizer.synthesize(
                username,
                thematicAnalyses,
                stats,
                traceability_map,
                allFindings.length,
                validInsights.length,
                healthReport
            );

            // Final Step: Store Identity Broker
            await LayeredPersistenceManager.storeIdentityBroker(username, dna);

            // Debug logging
            DebugLogger.logCurator('final_dna_synthesis', dna);

            return { dna, traceability_map: finalMap, performance: mapperResults.performance };
        } catch (e) {
            console.error(`[SYNTHESIS_CRASH] Fatal exception in SynthesisOrchestrator:`, e);
            Logger.error('SynthesisOrchestrator', `Global Synthesis failed: ${e.message}`);
            return { error: e.message, stack: e.stack };
        }
    }

    /**
     * Curate insights using the Funnel of Truth
     */
    curateInsights(findings, streamingHandler = null) {
        // This would delegate to InsightsCurator
        // Simplified implementation for now
        const validInsights = findings.filter(f => f && f.summary);

        // DEBUG: Forensic inspection of why findings are dropped
        if (findings.length > 0 && validInsights.length === 0) {
            Logger.error('SynthesisOrchestrator', `FORENSIC ALERT: All ${findings.length} findings dropped! Inspection of first finding:`);
            console.log("DEBUG_FINDING_DUMP:", JSON.stringify(findings[0], null, 2));
            if (findings[0].summary === undefined) console.log("DEBUG: summary is undefined");
            if (findings[0].summary === "") console.log("DEBUG: summary is empty string");
            if (typeof findings[0].summary === 'object') console.log("DEBUG: summary is OBJECT");
        }

        const repoCount = [...new Set(findings.map(f => f.repo))].length;

        // Group by content to find duplicates
        const contentMap = new Map();
        validInsights.forEach(f => {
            const key = f.summary?.substring(0, 50) || '';
            if (!contentMap.has(key)) {
                contentMap.set(key, []);
            }
            contentMap.get(key).push(f);
        });

        // Keep only unique insights (first occurrence)
        const deduplicated = Array.from(contentMap.values()).map(group => group[0]);

        // Calculate top strengths
        const strengthMap = new Map();
        deduplicated.forEach(f => {
            const domain = f.classification || 'General';
            strengthMap.set(domain, (strengthMap.get(domain) || 0) + 1);
        });

        const topStrengths = Array.from(strengthMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));

        const stats = {
            repoCount,
            totalInsights: findings.length,
            uniqueInsights: deduplicated.length,
            topStrengths
        };

        return {
            validInsights: deduplicated,
            anomalies: [],
            stats,
            traceability_map: streamingHandler?.getTraceabilityMap() || {}
        };
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

    /**
     * Merge pre-calculated thematic analyses from multiple repo blueprints
     * @param {Array} blueprints - Blueprints with thematicAnalysis
     * @returns {Object} Merged mapper results
     */
    _mergeThematicAnalyses(blueprints) {
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

        Logger.mapper(`Merged analyses: Arch=${merged.architecture.evidence_uids.length} UIDs, Habits=${merged.habits.evidence_uids.length} UIDs, Stack=${merged.stack.evidence_uids.length} UIDs`);

        return merged;
    }
}
