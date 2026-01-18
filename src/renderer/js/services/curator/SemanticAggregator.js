/**
 * SemanticAggregator - Aggregates semantic and contextual metrics
 * Handles business context, design tradeoffs, and multidimensional dimensions
 */

import { IMetricAggregator } from './IMetricAggregator.js';

export class SemanticAggregator extends IMetricAggregator {
    /**
     * Aggregate semantic metrics from memory nodes
     * @param {Array<MemoryNode>} nodes - Memory nodes to process
     * @param {number} totalFiles - Total files scanned
     * @returns {Object} Aggregated semantic metrics
     */
    aggregate(nodes, totalFiles = 0) {
        if (!this.validate(nodes)) {
            return this.getDefaultStructure();
        }

        const totals = {
            contexts: new Map(), // Business contexts frequency
            frameworks: new Map(), // Framework usage
            maturities: new Map(), // Maturity levels
            tradeoffs: new Map(), // Design tradeoffs
            dimensions: { social: 0, security: 0, testability: 0, count: 0 }
        };

        nodes.forEach(node => {
            const sem = node.metadata?.semantic || {};
            const dim = node.metadata?.dimensions || {};
            const nodePath = node.path || node.file || 'unknown';

            // Business contexts
            if (sem.business_context) {
                const ctx = sem.business_context;
                totals.contexts.set(ctx, (totals.contexts.get(ctx) || 0) + 1);
            }

            // Design tradeoffs
            if (sem.design_tradeoffs && Array.isArray(sem.design_tradeoffs)) {
                sem.design_tradeoffs.forEach(tradeoff => {
                    totals.tradeoffs.set(tradeoff, (totals.tradeoffs.get(tradeoff) || 0) + 1);
                });
            }

            // Dependencies and maturity
            if (sem.dependencies) {
                // Maturity levels
                if (sem.dependencies.maturity) {
                    const mat = sem.dependencies.maturity;
                    totals.maturities.set(mat, (totals.maturities.get(mat) || 0) + 1);
                }

                // Frameworks
                if (sem.dependencies.frameworks && Array.isArray(sem.dependencies.frameworks)) {
                    sem.dependencies.frameworks.forEach(framework => {
                        totals.frameworks.set(framework, (totals.frameworks.get(framework) || 0) + 1);
                    });
                }
            }

            // Multidimensional dimensions
            if (dim.social !== undefined) {
                totals.dimensions.social += dim.social || 0;
                totals.dimensions.security += dim.security || 0;
                totals.dimensions.testability += dim.testability || 0;
                totals.dimensions.count++;
            }
        });

        // Calculate final metrics
        const dimDenom = totals.dimensions.count || 1;

        // Helper for map sorting
        const getTopK = (map, k = 3) => [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(e => e[0]);

        return {
            contexts: {
                top_contexts: getTopK(totals.contexts, 3)
            },
            dependencies: {
                top_frameworks: getTopK(totals.frameworks, 5),
                dominant_maturity: getTopK(totals.maturities, 1)[0] || "Unknown"
            },
            design: {
                common_tradeoffs: getTopK(totals.tradeoffs, 3)
            },
            dimensions: {
                social: (totals.dimensions.social / dimDenom).toFixed(2),
                security: (totals.dimensions.security / dimDenom).toFixed(2),
                testability: (totals.dimensions.testability / dimDenom).toFixed(2)
            }
        };
    }

    /**
     * Get the domain name this aggregator handles
     * @returns {string} Domain identifier
     */
    getDomain() {
        return 'semantic';
    }

    /**
     * Get default structure for semantic metrics
     * @returns {Object} Default semantic metrics structure
     */
    getDefaultStructure() {
        return {
            contexts: {
                top_contexts: []
            },
            dependencies: {
                top_frameworks: [],
                dominant_maturity: "Unknown"
            },
            design: {
                common_tradeoffs: []
            },
            dimensions: {
                social: "0.00",
                security: "0.00",
                testability: "0.00"
            }
        };
    }

    /**
     * Enhanced validation for semantic-specific requirements
     * @param {Array<MemoryNode>} nodes - Nodes to validate
     * @returns {boolean} True if valid for semantic aggregation
     */
    validate(nodes) {
        if (!super.validate(nodes)) return false;

        // Check if any nodes have semantic or dimensions data
        const hasSemanticData = nodes.some(node => {
            const hasSemantic = node.metadata?.semantic &&
                typeof node.metadata.semantic === 'object';
            const hasDimensions = node.metadata?.dimensions &&
                typeof node.metadata.dimensions === 'object';

            return hasSemantic || hasDimensions;
        });

        return hasSemanticData;
    }
}
