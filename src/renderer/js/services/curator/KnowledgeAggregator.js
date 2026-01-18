/**
 * KnowledgeAggregator - Aggregates knowledge-related metrics (Clarity, Discipline, Depth)
 * Handles documentation, comments, and explanatory quality
 */

import { IMetricAggregator } from './IMetricAggregator.js';

export class KnowledgeAggregator extends IMetricAggregator {
    /**
     * Aggregate knowledge metrics from memory nodes
     * @param {Array<MemoryNode>} nodes - Memory nodes to process
     * @param {number} totalFiles - Total files scanned
     * @returns {Object} Aggregated knowledge metrics
     */
    aggregate(nodes, totalFiles = 0) {
        if (!this.validate(nodes)) {
            return this.getDefaultStructure();
        }

        const totals = {
            clarity: 0,
            discipline: 0,
            depth: 0,
            count: 0
        };

        nodes.forEach(node => {
            const k = node.metadata?.knowledge || {};
            const nodePath = node.path || node.file || 'unknown';

            if (k.clarity !== undefined && k.clarity !== null) {
                totals.clarity += Math.max(0, k.clarity);
                totals.discipline += Math.max(0, (k.discipline || 0));
                totals.depth += Math.max(0, (k.depth || 0));
                totals.count++;
            }
        });

        // Calculate averages
        const denominator = totals.count || 1;

        return {
            clarity: (totals.clarity / denominator).toFixed(2),
            discipline: (totals.discipline / denominator).toFixed(2),
            depth: (totals.depth / denominator).toFixed(2),
            analyzedFiles: totals.count
        };
    }

    /**
     * Get the domain name this aggregator handles
     * @returns {string} Domain identifier
     */
    getDomain() {
        return 'knowledge';
    }

    /**
     * Get default structure for knowledge metrics
     * @returns {Object} Default knowledge metrics structure
     */
    getDefaultStructure() {
        return {
            clarity: "0.00",
            discipline: "0.00",
            depth: "0.00",
            analyzedFiles: 0
        };
    }

    /**
     * Enhanced validation for knowledge-specific requirements
     * @param {Array<MemoryNode>} nodes - Nodes to validate
     * @returns {boolean} True if valid for knowledge aggregation
     */
    validate(nodes) {
        if (!super.validate(nodes)) return false;

        // Check if any nodes have knowledge data
        const hasKnowledgeData = nodes.some(node =>
            node.metadata?.knowledge &&
            typeof node.metadata.knowledge === 'object'
        );

        return hasKnowledgeData;
    }
}
