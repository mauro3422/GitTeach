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
        Logger.info('MetricRefinery', `Refining Dual-Track metrics for ${nodes.length} nodes...`);

        if (nodes.length === 0) return this._emptyReport();

        const totals = {
            logic: { solid: 0, modularity: 0, count: 0 },
            knowledge: { clarity: 0, discipline: 0, depth: 0, count: 0 },
            signals: { semantic: 0, resilience: 0, resources: 0, auditability: 0, domain_fidelity: 0, count: 0 },
            complexity: 0,
            compCount: 0,
            patterns: new Map(),
            domainCounts: new Map()
        };

        nodes.forEach(node => {
            const m = node.metadata || {};
            const isDoc = (node.classification || "").toLowerCase().includes('doc') ||
                (node.classification || "").toLowerCase().includes('legal');

            // 1. Logic Track (Code only)
            if (m.solid !== undefined && m.solid !== null && !isDoc) {
                totals.logic.solid += Math.max(0, m.solid);
                totals.logic.modularity += Math.max(0, m.modularity);
                totals.logic.count++;
            }

            // 2. Knowledge Track (Docs & Comments)
            const k = m.knowledge || {};
            if (k.clarity !== undefined) {
                totals.knowledge.clarity += k.clarity;
                totals.knowledge.discipline += k.discipline || 0;
                totals.knowledge.depth += k.depth || 0;
                totals.knowledge.count++;
            }

            // 3. Seniority Signals
            const s = m.signals || {};
            if (s.semantic !== undefined) {
                totals.signals.semantic += s.semantic;
                totals.signals.resilience += s.resilience || 0;
                totals.signals.resources += s.resources || 0;
                totals.signals.auditability += s.auditability || 0;
                totals.signals.domain_fidelity += s.domain_fidelity || 0;
                totals.signals.count++;
            }

            // 4. Complexity (Unified)
            if (node.params && node.params.complexity !== undefined) {
                totals.complexity += Math.max(0, node.params.complexity);
                totals.compCount++;
            }

            // patterns & domains...
            if (Array.isArray(m.patterns)) {
                m.patterns.forEach(p => {
                    const count = totals.patterns.get(p) || 0;
                    totals.patterns.set(p, count + 1);
                });
            }
            const domain = node.classification || 'General';
            const dCount = totals.domainCounts.get(domain) || 0;
            totals.domainCounts.set(domain, dCount + 1);
        });

        // Calculate Averages
        const logDenom = totals.logic.count || 1;
        const knowDenom = totals.knowledge.count || 1;
        const sigDenom = totals.signals.count || 1;
        const compDenom = totals.compCount || 1;

        const report = {
            logic_health: {
                solid: (totals.logic.solid / logDenom).toFixed(2),
                modularity: (totals.logic.modularity / logDenom).toFixed(2),
                complexity: (totals.complexity / compDenom).toFixed(2)
            },
            knowledge_health: {
                clarity: (totals.knowledge.clarity / knowDenom).toFixed(2),
                discipline: (totals.knowledge.discipline / knowDenom).toFixed(2),
                depth: (totals.knowledge.depth / knowDenom).toFixed(2)
            },
            seniority_signals: {
                semantic: (totals.signals.semantic / sigDenom).toFixed(2),
                resilience: (totals.signals.resilience / sigDenom).toFixed(2),
                resources: (totals.signals.resources / sigDenom).toFixed(2),
                auditability: (totals.signals.auditability / sigDenom).toFixed(2),
                domain_fidelity: (totals.signals.domain_fidelity / sigDenom).toFixed(2)
            },
            volume: {
                analyzedFiles: nodes.length,
                totalFiles: totalFilesScanned,
                coverage: `${totalFilesScanned > 0 ? ((nodes.length / totalFilesScanned) * 100).toFixed(1) : 100}%`,
                status: this._getVolumeStatus(nodes.length, (nodes.length / (totalFilesScanned || 1)) * 100)
            },
            domains: Object.fromEntries(totals.domainCounts),
            timestamp: new Date().toISOString()
        };

        // Compatibility fix for older synthesizers (DNASynthesizer still expects healthReport.averages)
        report.averages = {
            solid: report.logic_health.solid,
            modularity: report.logic_health.modularity,
            readability: report.knowledge_health.clarity,
            complexity: report.logic_health.complexity
        };

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
            logic_health: { solid: "0.00", modularity: "0.00", complexity: "0.00" },
            knowledge_health: { clarity: "0.00", discipline: "0.00", depth: "0.00" },
            seniority_signals: { semantic: "0.00", resilience: "0.00", resources: "0.00", auditability: "0.00", domain_fidelity: "0.00" },
            averages: { solid: 0, modularity: 0, readability: 0 },
            topPatterns: [],
            volume: { analyzedFiles: 0, totalFiles: 0, coverage: '0%', status: 'EMPTY' },
            domains: {},
            timestamp: new Date().toISOString()
        };
    }
}
