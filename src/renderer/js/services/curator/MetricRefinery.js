/**
 * MetricRefinery - Thin orchestrator for metric aggregation
 * Delegates to specialized aggregators for domain-specific calculations
 */

import { MetricAggregatorOrchestrator } from './MetricAggregatorOrchestrator.js';
import { Logger } from '../../utils/logger.js';

export class MetricRefinery {
    constructor() {
        this.orchestrator = new MetricAggregatorOrchestrator();
    }

    /**
     * Refine all metrics into a global report using specialized aggregators
     * @param {Array<MemoryNode>} nodes - All nodes with metadata
     * @param {number} totalFilesScanned - Total files across all repos
     * @returns {Object} GlobalHealthReport
     */
    static refine(nodes, totalFilesScanned = 0) {
        Logger.info('MetricRefinery', `Refining Dual-Track metrics for ${nodes.length} nodes...`);

        const instance = new MetricRefinery();
        return instance.orchestrator.aggregateAll(nodes, totalFilesScanned);
    }

    /**
     * Get volume status for statistical significance determination
     * @param {number} count - Number of files analyzed
     * @param {number} coverage - Coverage percentage
     * @returns {string} Status string
     */
    static _getVolumeStatus(count, coverage) {
        if (count < 5) return 'EXPERIMENTAL'; // Too few files
        if (coverage < 10) return 'SURFACE';   // Low coverage
        if (coverage < 40) return 'ESTABLISHED';
        return 'DEEP';
    }

    /**
     * Get empty report structure
     * @returns {Object} Empty report
     */
    static _emptyReport() {
        const instance = new MetricRefinery();
        return instance.orchestrator._getEmptyReport();
    }

    /**
     * Get access to the underlying orchestrator for advanced operations
     * @returns {MetricAggregatorOrchestrator} The orchestrator instance
     */
    getOrchestrator() {
        return this.orchestrator;
    }

    /**
     * Get a specific aggregator by domain
     * @param {string} domain - Domain name
     * @returns {IMetricAggregator|null} The aggregator or null
     */
    getAggregator(domain) {
        return this.orchestrator.getAggregator(domain);
    }

    /**
     * Get all available aggregation domains
     * @returns {Array<string>} List of domain names
     */
    getAvailableDomains() {
        return this.orchestrator.getAvailableDomains();
    }
}
