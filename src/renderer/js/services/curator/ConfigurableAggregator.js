/**
 * ConfigurableAggregator - Base class for configurable metric aggregators
 * Allows creation of domain-specific aggregators through configuration objects
 */

export class ConfigurableAggregator {
    /**
     * Constructor for ConfigurableAggregator
     * @param {Object} config - Configuration object for this aggregator
     * @param {string} config.domain - Domain identifier
     * @param {Object} config.fieldMappings - Mapping of output fields to input sources
     * @param {Function} config.aggregationLogic - Function to perform aggregation
     * @param {Function} config.validationLogic - Function to validate input data
     * @param {Object} config.defaultStructure - Default output structure
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Aggregate metrics from memory nodes using configured logic
     * @param {Array<MemoryNode>} nodes - Memory nodes to process
     * @param {number} totalFiles - Total files scanned (optional context)
     * @returns {Object} Aggregated metrics for this domain
     */
    aggregate(nodes, totalFiles = 0) {
        if (!this.validate(nodes)) {
            return this.getDefaultStructure();
        }

        // Use the configured aggregation logic if provided, otherwise use a default
        if (this.config.aggregationLogic && typeof this.config.aggregationLogic === 'function') {
            return this.config.aggregationLogic(nodes, totalFiles, this.config);
        }

        // Default aggregation logic - this would typically be overridden by config
        return this.getDefaultStructure();
    }

    /**
     * Get the domain name this aggregator handles
     * @returns {string} Domain identifier
     */
    getDomain() {
        return this.config.domain;
    }

    /**
     * Validate that required data is present for aggregation using configured logic
     * @param {Array<MemoryNode>} nodes - Nodes to validate
     * @returns {boolean} True if valid for aggregation
     */
    validate(nodes) {
        // Use the configured validation logic if provided, otherwise use a default
        if (this.config.validationLogic && typeof this.config.validationLogic === 'function') {
            return this.config.validationLogic(nodes);
        }

        // Default validation - check if nodes exist and are an array
        return nodes && Array.isArray(nodes) && nodes.length > 0;
    }

    /**
     * Get default structure for this aggregator's output
     * @returns {Object} Default metrics structure
     */
    getDefaultStructure() {
        return this.config.defaultStructure || {};
    }
}