/**
 * ResilienceAggregator - Aggregates resilience and forensics metrics
 * Handles error handling, defensive programming, and optimization signals
 */

import { IMetricAggregator } from './IMetricAggregator.js';

export class ResilienceAggregator extends IMetricAggregator {
    /**
     * Aggregate resilience metrics from memory nodes
     * @param {Array<MemoryNode>} nodes - Memory nodes to process
     * @param {number} totalFiles - Total files scanned
     * @returns {Object} Aggregated resilience metrics
     */
    aggregate(nodes, totalFiles = 0) {
        if (!this.validate(nodes)) {
            return this.getDefaultStructure();
        }

        const totals = {
            error_discipline: 0,
            defensive_posture: 0,
            optimization_score: 0,
            domain_fidelity: 0,
            antipatterns: new Map(),
            count: 0
        };

        nodes.forEach(node => {
            const res = node.metadata?.resilience_forensics || {};
            const signals = node.metadata?.signals || {};
            const nodePath = node.path || node.file || 'unknown';

            console.log(`[ResilienceAgg] Node ${nodePath}: signals=${!!node.metadata?.signals}, res_forensics=${!!node.metadata?.resilience_forensics}`);

            // Resilience forensics metrics
            if (res.error_discipline !== undefined || node.metadata?.signals) {
                totals.error_discipline += res.error_discipline || signals.auditability || 0;
                totals.defensive_posture += res.defensive_posture || signals.resilience || 0;
                totals.optimization_score += res.optimization_score || signals.resources || 0;
                totals.domain_fidelity += signals.domain_fidelity || 0;

                // Anti-patterns tracking
                if (Array.isArray(res.antipatterns)) {
                    res.antipatterns.forEach(ap => {
                        totals.antipatterns.set(ap, (totals.antipatterns.get(ap) || 0) + 1);
                    });
                }

                totals.count++;
            } else {
                console.warn(`[ResilienceAgg] Node ${nodePath}: Missing required resilience data fields.`);
            }
        });

        // Calculate averages
        const denominator = totals.count || 1;

        // Helper for map sorting
        const getTopK = (map, k = 5) => [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(e => e[0]);

        return {
            error_discipline_score: (totals.error_discipline / denominator).toFixed(2),
            defensive_posture_score: (totals.defensive_posture / denominator).toFixed(2),
            optimization_score: (totals.optimization_score / denominator).toFixed(2),
            domain_fidelity_score: (totals.domain_fidelity / denominator).toFixed(2),
            common_antipatterns: getTopK(totals.antipatterns, 5),
            analyzed_files: totals.count
        };
    }

    /**
     * Get the domain name this aggregator handles
     * @returns {string} Domain identifier
     */
    getDomain() {
        return 'resilience';
    }

    /**
     * Get default structure for resilience metrics
     * @returns {Object} Default resilience metrics structure
     */
    getDefaultStructure() {
        return {
            error_discipline_score: "0.00",
            defensive_posture_score: "0.00",
            optimization_score: "0.00",
            domain_fidelity_score: "0.00",
            common_antipatterns: [],
            analyzed_files: 0
        };
    }

    /**
     * Enhanced validation for resilience-specific requirements
     * @param {Array<MemoryNode>} nodes - Nodes to validate
     * @returns {boolean} True if valid for resilience aggregation
     */
    validate(nodes) {
        if (!super.validate(nodes)) return false;

        // Check if any nodes have resilience metrics OR seniority signals
        const hasData = nodes.some(node =>
            (node.metadata?.resilience_forensics && Object.keys(node.metadata.resilience_forensics).length > 0) ||
            (node.metadata?.signals && Object.keys(node.metadata.signals).length > 0)
        );

        return hasData;
    }
}
