/**
 * MetricRefinery - Mathematical aggregator for worker metadata
 * 
 * Responsibilities:
 * - Aggregate metrics from all memory nodes.
 * - Calculate global averages (SOLID, Modularity, etc).
 * - Detect bias and volume statistics.
 * - Generate a GlobalHealthReport for Curator and Synthesizer.
 */
import { Logger } from '../../utils/logger.js';

export class MetricRefinery {
    /**
     * Refine all metrics into a global report
     * @param {Array<MemoryNode>} nodes - All nodes with metadata
     * @param {number} totalFilesScanned - Total files across all repos
     * @returns {Object} GlobalHealthReport
     */
    static refine(nodes, totalFilesScanned = 0) {
        Logger.info('MetricRefinery', `Refining metrics for ${nodes.length} nodes...`);

        if (nodes.length === 0) return this._emptyReport();

        const totals = {
            solid: 0,
            modularity: 0,
            readability: 0,
            patterns: new Map(),
            domainCounts: new Map()
        };

        let nodesWithMetadata = 0;

        nodes.forEach(node => {
            const m = node.metadata || {};
            if (m.solid !== undefined) {
                totals.solid += (m.solid || 2);
                totals.modularity += (m.modularity || 2);
                totals.readability += (m.readability || 2);
                nodesWithMetadata++;

                // Collect patterns
                if (Array.isArray(m.patterns)) {
                    m.patterns.forEach(p => {
                        const count = totals.patterns.get(p) || 0;
                        totals.patterns.set(p, count + 1);
                    });
                }
            }

            // Domain distribution
            const domain = node.classification || 'General';
            const dCount = totals.domainCounts.get(domain) || 0;
            totals.domainCounts.set(domain, dCount + 1);
        });

        // Calculate averages
        const denominator = nodesWithMetadata || 1;
        const averages = {
            solid: (totals.solid / denominator).toFixed(2),
            modularity: (totals.modularity / denominator).toFixed(2),
            readability: (totals.readability / denominator).toFixed(2)
        };

        // Top patterns
        const topPatterns = Array.from(totals.patterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        // Realism Filter Data
        // How much of the project was actually analyzed?
        const coverage = totalFilesScanned > 0
            ? ((nodes.length / totalFilesScanned) * 100).toFixed(1)
            : 100;

        const report = {
            averages,
            topPatterns,
            volume: {
                analyzedFiles: nodes.length,
                totalFiles: totalFilesScanned,
                coverage: `${coverage}%`,
                status: this._getVolumeStatus(nodes.length, coverage)
            },
            domains: Object.fromEntries(totals.domainCounts),
            timestamp: new Date().toISOString()
        };

        Logger.success('MetricRefinery', `Report generated. SOLID Avg: ${averages.solid}, Coverage: ${coverage}%`);
        return report;
    }

    /**
     * Determine if findings are statistically significant
     */
    static _getVolumeStatus(count, coverage) {
        if (count < 5) return 'EXPERIMENTAL'; // Too few files
        if (coverage < 10) return 'SURFACE';   // Low coverage
        if (coverage < 40) return 'ESTABLISHED';
        return 'DEEP';
    }

    static _emptyReport() {
        return {
            averages: { solid: 0, modularity: 0, readability: 0 },
            topPatterns: [],
            volume: { analyzedFiles: 0, totalFiles: 0, coverage: '0%', status: 'EMPTY' },
            domains: {}
        };
    }
}
