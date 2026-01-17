/**
 * IMetricAggregator - Interface contract for metric aggregators
 * Defines the standard interface that all aggregators must implement
 */

export class IMetricAggregator {
    /**
     * Aggregate metrics from memory nodes
     * @param {Array<MemoryNode>} nodes - Memory nodes to process
     * @param {number} totalFiles - Total files scanned (optional context)
     * @returns {Object} Aggregated metrics for this domain
     */
    aggregate(nodes, totalFiles = 0) {
        throw new Error('aggregate method must be implemented by subclass');
    }

    /**
     * Get the domain name this aggregator handles
     * @returns {string} Domain identifier
     */
    getDomain() {
        throw new Error('getDomain method must be implemented by subclass');
    }

    /**
     * Validate that required data is present for aggregation
     * @param {Array<MemoryNode>} nodes - Nodes to validate
     * @returns {boolean} True if valid for aggregation
     */
    validate(nodes) {
        return nodes && Array.isArray(nodes) && nodes.length > 0;
    }

    /**
     * Get default structure for this aggregator's output
     * @returns {Object} Default metrics structure
     */
    getDefaultStructure() {
        throw new Error('getDefaultStructure method must be implemented by subclass');
    }
}
