/**
 * LogicAggregator - Aggregates logic-related metrics (SOLID, Modularity, Complexity)
 * Handles technical code quality metrics excluding documentation
 */

import { IMetricAggregator } from './IMetricAggregator.js';

export class LogicAggregator extends IMetricAggregator {
    /**
     * Aggregate logic metrics from memory nodes
     * @param {Array<MemoryNode>} nodes - Memory nodes to process
     * @param {number} totalFiles - Total files scanned
     * @returns {Object} Aggregated logic metrics
     */
    aggregate(nodes, totalFiles = 0) {
        if (!this.validate(nodes)) {
            return this.getDefaultStructure();
        }

        const totals = {
            solid: 0,
            modularity: 0,
            complexity: 0,
            count: 0
        };

        // Filter out documentation nodes for logic metrics
        const codeNodes = nodes.filter(node => {
            const classification = (node.classification || "").toLowerCase();
            return !classification.includes('doc') && !classification.includes('legal');
        });

        codeNodes.forEach(node => {
            const m = node.metadata || {};

            // SOLID principles (only for code nodes)
            if (m.solid !== undefined && m.solid !== null) {
                totals.solid += Math.max(0, m.solid);
                totals.count++;
            }

            // Modularity (only for code nodes)
            if (m.modularity !== undefined && m.modularity !== null) {
                totals.modularity += Math.max(0, m.modularity);
            }

            // Complexity (can be meaningful for docs too, but weighted differently)
            if (node.params && node.params.complexity !== undefined) {
                totals.complexity += Math.max(0, node.params.complexity);
            }
        });

        // Calculate averages
        const denominator = totals.count || 1;
        const complexityDenominator = codeNodes.length || 1;

        return {
            solid: (totals.solid / denominator).toFixed(2),
            modularity: (totals.modularity / denominator).toFixed(2),
            complexity: (totals.complexity / complexityDenominator).toFixed(2),
            analyzedFiles: codeNodes.length
        };
    }

    /**
     * Get the domain name this aggregator handles
     * @returns {string} Domain identifier
     */
    getDomain() {
        return 'logic';
    }

    /**
     * Get default structure for logic metrics
     * @returns {Object} Default logic metrics structure
     */
    getDefaultStructure() {
        return {
            solid: "0.00",
            modularity: "0.00",
            complexity: "0.00",
            analyzedFiles: 0
        };
    }

    /**
     * Enhanced validation for logic-specific requirements
     * @param {Array<MemoryNode>} nodes - Nodes to validate
     * @returns {boolean} True if valid for logic aggregation
     */
    validate(nodes) {
        if (!super.validate(nodes)) return false;

        // Check if we have at least some code-related nodes
        const hasCodeNodes = nodes.some(node => {
            const classification = (node.classification || "").toLowerCase();
            return !classification.includes('doc') && !classification.includes('legal');
        });

        return hasCodeNodes;
    }
}
