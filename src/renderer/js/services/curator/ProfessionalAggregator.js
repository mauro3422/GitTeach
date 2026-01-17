/**
 * ProfessionalAggregator - Aggregates professional development metrics
 * Handles code quality, ecosystem signals, collaboration, and growth indicators
 */

import { IMetricAggregator } from './IMetricAggregator.js';

export class ProfessionalAggregator extends IMetricAggregator {
    /**
     * Aggregate professional metrics from memory nodes
     * @param {Array<MemoryNode>} nodes - Memory nodes to process
     * @param {number} totalFiles - Total files scanned
     * @returns {Object} Aggregated professional metrics
     */
    aggregate(nodes, totalFiles = 0) {
        if (!this.validate(nodes)) {
            return this.getDefaultStructure();
        }

        const totals = {
            quality: { cyclomatic: 0, debt: 0, maintainability: 0, count: 0 },
            ecosystem: { tools: new Map(), strategies: new Map() },
            collaboration: { review: 0, mentoring: new Map(), count: 0 },
            growth: { signals: new Map(), vibes: new Map() },
            churn: { dates: [], authors: new Map() }
        };

        nodes.forEach(node => {
            const prof = node.metadata?.professional || {};
            const meta = node.file_meta || node.metadata?.file_meta || {};

            // Code Quality metrics
            if (prof.code_quality) {
                totals.quality.cyclomatic += prof.code_quality.cyclomatic || 0;
                totals.quality.debt += prof.code_quality.debt_ratio || 0;
                totals.quality.maintainability += prof.code_quality.maintainability || 0;
                totals.quality.count++;
            }

            // Ecosystem signals
            if (prof.ecosystem) {
                if (Array.isArray(prof.ecosystem.ci_cd)) {
                    prof.ecosystem.ci_cd.forEach(tool => {
                        totals.ecosystem.tools.set(tool, (totals.ecosystem.tools.get(tool) || 0) + 1);
                    });
                }
                if (prof.ecosystem.strategy) {
                    const strategy = prof.ecosystem.strategy;
                    totals.ecosystem.strategies.set(strategy, (totals.ecosystem.strategies.get(strategy) || 0) + 1);
                }
            }

            // Collaboration metrics
            if (prof.collaboration) {
                totals.collaboration.review += prof.collaboration.review_ready || 0;
                if (prof.collaboration.mentoring) {
                    const mentoring = prof.collaboration.mentoring;
                    totals.collaboration.mentoring.set(mentoring, (totals.collaboration.mentoring.get(mentoring) || 0) + 1);
                }
                totals.collaboration.count++;
            }

            // Growth signals
            if (prof.growth) {
                if (Array.isArray(prof.growth.learning_signals)) {
                    prof.growth.learning_signals.forEach(signal => {
                        totals.growth.signals.set(signal, (totals.growth.signals.get(signal) || 0) + 1);
                    });
                }
                if (prof.growth.seniority_vibe) {
                    const vibe = prof.growth.seniority_vibe;
                    totals.growth.vibes.set(vibe, (totals.growth.vibes.get(vibe) || 0) + 1);
                }
            }

            // Code Churn data
            if (meta.last_modified) {
                totals.churn.dates.push(new Date(meta.last_modified).getTime());
                if (meta.author) {
                    totals.churn.authors.set(meta.author, (totals.churn.authors.get(meta.author) || 0) + 1);
                }
            }
        });

        // Calculate final metrics
        const qualityDenom = totals.quality.count || 1;
        const collabDenom = totals.collaboration.count || 1;

        // Helper for map sorting
        const getTopK = (map, k = 3) => [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(e => e[0]);

        return {
            quality: {
                cyclomatic: (totals.quality.cyclomatic / qualityDenom).toFixed(2),
                debt_ratio: (totals.quality.debt / qualityDenom).toFixed(2),
                maintainability: (totals.quality.maintainability / qualityDenom).toFixed(2)
            },
            ecosystem: {
                top_tools: getTopK(totals.ecosystem.tools, 5),
                dominant_strategy: getTopK(totals.ecosystem.strategies, 1)[0] || "Unknown"
            },
            collaboration: {
                review_participation: (totals.collaboration.review / collabDenom).toFixed(2),
                mentoring_culture: getTopK(totals.collaboration.mentoring, 1)[0] || "Neutral"
            },
            growth: {
                dominant_vibe: getTopK(totals.growth.vibes, 1)[0] || "Unknown",
                skill_signals: getTopK(totals.growth.signals, 5)
            },
            churn: {
                avg_age_days: totals.churn.dates.length > 0
                    ? ((Date.now() - (totals.churn.dates.reduce((a, b) => a + b, 0) / totals.churn.dates.length)) / (1000 * 60 * 60 * 24)).toFixed(1)
                    : "Unknown",
                unique_authors: totals.churn.authors.size
            }
        };
    }

    /**
     * Get the domain name this aggregator handles
     * @returns {string} Domain identifier
     */
    getDomain() {
        return 'professional';
    }

    /**
     * Get default structure for professional metrics
     * @returns {Object} Default professional metrics structure
     */
    getDefaultStructure() {
        return {
            quality: { cyclomatic: "0.00", debt_ratio: "0.00", maintainability: "0.00" },
            ecosystem: { top_tools: [], dominant_strategy: "Unknown" },
            collaboration: { review_participation: "0.00", mentoring_culture: "Neutral" },
            growth: { dominant_vibe: "Unknown", skill_signals: [] },
            churn: { avg_age_days: "Unknown", unique_authors: 0 }
        };
    }
}
