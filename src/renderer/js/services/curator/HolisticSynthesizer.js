/**
 * HolisticSynthesizer - Deterministic Global Metrics Engine
 * 
 * Responsibilities:
 * - Calculate cross-repository metrics (Versatility, Consistency, Evolution).
 * - Provide a mathematical "Meta-Layer" above individual Repo Blueprints.
 * - This engine is Pure Logic (No AI), ensuring objective global analysis.
 */
import { Logger } from '../../utils/logger.js';

export class HolisticSynthesizer {
    /**
     * Synthesize global holistic metrics from a collection of Repo Blueprints
     * @param {Array<Object>} blueprints - List of Repo Blueprints
     * @returns {Object} Holistic Metrics Object
     */
    synthesize(blueprints) {
        if (!blueprints || blueprints.length === 0) return this._getDefaultMetrics();

        Logger.reducer(`Synthesizing Holistic Metrics from ${blueprints.length} blueprints...`);

        return {
            versatility_index: this._calculateVersatility(blueprints),
            consistency_score: this._calculateConsistency(blueprints),
            evolution_rate: this._calculateEvolution(blueprints),
            domain_dominance: this._calculateDomainDominance(blueprints),
            inventory: this._calculateInventory(blueprints)
        };
    }

    /**
     * Aggregate most frequent technologies, patterns, and architectures
     * extracted from all repository blueprints.
     */
    _calculateInventory(blueprints) {
        const inventory = {
            technologies: new Map(),
            patterns: new Map(),
            architectures: new Map(),
            languages: new Map()
        };

        blueprints.forEach(bp => {
            const thematic = bp.thematicAnalysis;
            if (!thematic) return;

            // Extract from Stack
            if (thematic.stack) {
                (thematic.stack.technologies || []).forEach(t => inventory.technologies.set(t, (inventory.technologies.get(t) || 0) + 1));
                (thematic.stack.languages || []).forEach(l => inventory.languages.set(l, (inventory.languages.get(l) || 0) + 1));
            }

            // Extract from Architecture
            if (thematic.architecture) {
                (thematic.architecture.patterns || []).forEach(p => inventory.patterns.set(p, (inventory.patterns.get(p) || 0) + 1));
                (thematic.architecture.architectures || []).forEach(a => inventory.architectures.set(a, (inventory.architectures.get(a) || 0) + 1));
            }
        });

        // Convert and sort
        const sortMap = (map) => Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([item, count]) => ({ item, count }));

        return {
            technologies: sortMap(inventory.technologies),
            patterns: sortMap(inventory.patterns),
            architectures: sortMap(inventory.architectures),
            languages: sortMap(inventory.languages)
        };
    }

    /**
     * Calculate Versatility (The Polymer Factor)
     * Measure of how diverse the developer's work is (Tech Stack + Logic/Knowledge Variance).
     * @returns {string} 0.00 - 100.00
     */
    _calculateVersatility(blueprints) {
        // 1. Domain Variance
        const allDomains = new Set();
        blueprints.forEach(bp => {
            if (bp.domains) Object.keys(bp.domains).forEach(d => allDomains.add(d));
        });
        const domainCount = allDomains.size;

        // 2. Metric Variance (Standard Deviation of Logic/Knowledge spread)
        // If Logic/Knowledge gap varies wildly, they adapt to different project needs.
        const gaps = blueprints.map(bp => {
            const logic = parseFloat(bp.metrics?.logic?.solid || 0);
            const know = parseFloat(bp.metrics?.knowledge?.clarity || 0);
            return Math.abs(logic - know);
        });
        const gapVariance = this._calculateStdDev(gaps);

        // Score Calculation
        // Base: 50 + (Domains * 5) + (GapVariance * 10)
        let score = 50 + (domainCount * 5) + (gapVariance * 10);
        return Math.min(score, 100).toFixed(2);
    }

    /**
     * Calculate Consistency (The Standard Deviation)
     * Measure of professional discipline (Standard Deviation of Knowledge Health).
     * @returns {string} 0.00 (Erratic) - 100.00 (Rock Solid)
     */
    _calculateConsistency(blueprints) {
        const knowledgeScores = blueprints.map(bp => parseFloat(bp.metrics?.knowledge?.clarity || 0));
        const stdDev = this._calculateStdDev(knowledgeScores);

        // Lower StdDev = Higher Consistency.
        // Map: StdDev 0 -> 100, StdDev 2.5 -> 0
        const score = Math.max(0, 100 - (stdDev * 40));
        return score.toFixed(2);
    }

    /**
     * Calculate Evolution Rate (Time-Based Delta)
     * Measure of improvement over time (Newer Repos vs Older Repos).
     * @returns {string} "+0.50/year" or "-0.20/year"
     */
    _calculateEvolution(blueprints) {
        // Sort by timestamp (if available) or assume input order roughly correlates
        // For real accuracy, we need dates. Assuming blueprints have 'timestamp'.
        const timeSeries = blueprints
            .map(bp => ({
                date: new Date(bp.timestamp || Date.now()).getTime(),
                score: parseFloat(bp.metrics?.logic?.solid || 0) + parseFloat(bp.metrics?.knowledge?.clarity || 0)
            }))
            .sort((a, b) => a.date - b.date);

        if (timeSeries.length < 2) return "0.00/year";

        const first = timeSeries[0];
        const last = timeSeries[timeSeries.length - 1];

        // Avoid division by zero if dates are identical
        const daysDiff = Math.max(1, (last.date - first.date) / (1000 * 60 * 60 * 24));
        const yearsDiff = daysDiff / 365;
        const scoreDiff = last.score - first.score;

        if (yearsDiff < 0.1) return "Stable"; // Less than a month diff

        const rate = scoreDiff / yearsDiff;
        return (rate >= 0 ? "+" : "") + rate.toFixed(2) + "/year";
    }

    /**
     * Identify Top/Dominant Domains
     */
    _calculateDomainDominance(blueprints) {
        const counts = {};
        blueprints.forEach(bp => {
            if (bp.domains) {
                Object.entries(bp.domains).forEach(([k, v]) => {
                    counts[k] = (counts[k] || 0) + v;
                });
            }
        });

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([k, v]) => `${k} (${v})`);
    }

    /**
     * Helper: Standard Deviation
     */
    _calculateStdDev(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }

    _getDefaultMetrics() {
        return {
            versatility_index: "0.00",
            consistency_score: "0.00",
            evolution_rate: "0.00/year",
            domain_dominance: []
        };
    }
}
