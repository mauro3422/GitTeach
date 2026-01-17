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
            domainCounts: new Map(),
            // NEW: Extended Metadata Aggregators
            dimensions: { social: 0, security: 0, testability: 0, count: 0 },
            semantic: {
                contexts: new Map(), // Frequency map for business contexts
                frameworks: new Map(),
                maturities: new Map(),
                tradeoffs: new Map()
            },
            professional: {
                quality: { cyclomatic: 0, debt: 0, maintainability: 0, count: 0 },
                ecosystem: { tools: new Map(), strategies: new Map() },
                collaboration: { review: 0, mentoring: new Map(), count: 0 },
                growth: { signals: new Map(), vibes: new Map() },
                churn: { dates: [], authors: new Map() }
            },
            resilience_forensics: {
                error_discipline: 0,
                defensive_posture: 0,
                optimization_score: 0,
                antipatterns: new Map(),
                count: 0
            }
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

            // 3b. Multidimensional Metrics
            const d = m.dimensions || {};
            if (d.social !== undefined) {
                totals.dimensions.social += d.social || 0;
                totals.dimensions.security += d.security || 0;
                totals.dimensions.testability += d.testability || 0;
                totals.dimensions.count++;
            }

            // 3c. Semantic Aggregation
            const sem = m.semantic || {};
            if (sem.business_context) {
                const ctx = sem.business_context;
                totals.semantic.contexts.set(ctx, (totals.semantic.contexts.get(ctx) || 0) + 1);
            }
            if (sem.design_tradeoffs && Array.isArray(sem.design_tradeoffs)) {
                sem.design_tradeoffs.forEach(t => {
                    totals.semantic.tradeoffs.set(t, (totals.semantic.tradeoffs.get(t) || 0) + 1);
                });
            }
            if (sem.dependencies) {
                if (sem.dependencies.maturity) {
                    const mat = sem.dependencies.maturity;
                    totals.semantic.maturities.set(mat, (totals.semantic.maturities.get(mat) || 0) + 1);
                }
                if (sem.dependencies.frameworks && Array.isArray(sem.dependencies.frameworks)) {
                    sem.dependencies.frameworks.forEach(f => {
                        totals.semantic.frameworks.set(f, (totals.semantic.frameworks.get(f) || 0) + 1);
                    });
                }
            }

            // 3d. Professional Context
            const prof = m.professional || {};
            if (prof.code_quality) {
                totals.professional.quality.cyclomatic += prof.code_quality.cyclomatic || 0;
                totals.professional.quality.debt += prof.code_quality.debt_ratio || 0;
                totals.professional.quality.maintainability += prof.code_quality.maintainability || 0;
                totals.professional.quality.count++;
            }
            if (prof.ecosystem) {
                if (Array.isArray(prof.ecosystem.ci_cd)) {
                    prof.ecosystem.ci_cd.forEach(t => totals.professional.ecosystem.tools.set(t, (totals.professional.ecosystem.tools.get(t) || 0) + 1));
                }
                if (prof.ecosystem.strategy) {
                    totals.professional.ecosystem.strategies.set(prof.ecosystem.strategy, (totals.professional.ecosystem.strategies.get(prof.ecosystem.strategy) || 0) + 1);
                }
            }
            if (prof.collaboration) {
                totals.professional.collaboration.review += prof.collaboration.review_ready || 0;
                if (prof.collaboration.mentoring) {
                    totals.professional.collaboration.mentoring.set(prof.collaboration.mentoring, (totals.professional.collaboration.mentoring.get(prof.collaboration.mentoring) || 0) + 1);
                }
                totals.professional.collaboration.count++;
            }
            if (prof.growth) {
                if (Array.isArray(prof.growth.learning_signals)) {
                    prof.growth.learning_signals.forEach(s => totals.professional.growth.signals.set(s, (totals.professional.growth.signals.get(s) || 0) + 1));
                }
                if (prof.growth.seniority_vibe) {
                    totals.professional.growth.vibes.set(prof.growth.seniority_vibe, (totals.professional.growth.vibes.get(prof.growth.seniority_vibe) || 0) + 1);
                }
            }

            // 3e. File Metadata (Code Churn) - MOVED & FIXED
            const meta = node.file_meta || m.file_meta || {};
            if (meta.last_modified) {
                totals.professional.churn.dates.push(new Date(meta.last_modified).getTime());
                if (meta.author) {
                    totals.professional.churn.authors.set(meta.author, (totals.professional.churn.authors.get(meta.author) || 0) + 1);
                }
            }

            // 3f. Resilience & Forensics (New)
            const res = m.resilience_forensics || {};
            if (res.error_discipline !== undefined) {
                totals.resilience_forensics.error_discipline += res.error_discipline || 0;
                totals.resilience_forensics.defensive_posture += res.defensive_posture || 0;
                totals.resilience_forensics.optimization_score += res.optimization_score || 0;
                if (Array.isArray(res.antipatterns)) {
                    res.antipatterns.forEach(ap => {
                        totals.resilience_forensics.antipatterns.set(ap, (totals.resilience_forensics.antipatterns.get(ap) || 0) + 1);
                    });
                }
                totals.resilience_forensics.count++;
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
        const dimDenom = totals.dimensions.count || 1;
        const profDenom = totals.professional.quality.count || 1;
        const collabDenom = totals.professional.collaboration.count || 1;
        const resDenom = totals.resilience_forensics.count || 1;
        const compDenom = totals.compCount || 1;

        // Helper for map sorting
        const getTopK = (map, k = 3) => [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(e => e[0]);

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
            // NEW: Extended Metadata Report
            extended_metadata: {
                dimensions: {
                    social: (totals.dimensions.social / dimDenom).toFixed(2),
                    security: (totals.dimensions.security / dimDenom).toFixed(2),
                    testability: (totals.dimensions.testability / dimDenom).toFixed(2)
                },
                semantic: {
                    top_contexts: getTopK(totals.semantic.contexts, 3),
                    top_frameworks: getTopK(totals.semantic.frameworks, 5),
                    dominant_maturity: getTopK(totals.semantic.maturities, 1)[0] || "Unknown",
                    common_tradeoffs: getTopK(totals.semantic.tradeoffs, 3)
                },
                professional: {
                    quality: {
                        cyclomatic: (totals.professional.quality.cyclomatic / profDenom).toFixed(2),
                        debt_ratio: (totals.professional.quality.debt / profDenom).toFixed(2),
                        maintainability: (totals.professional.quality.maintainability / profDenom).toFixed(2)
                    },
                    ecosystem: {
                        top_tools: getTopK(totals.professional.ecosystem.tools, 5),
                        dominant_strategy: getTopK(totals.professional.ecosystem.strategies, 1)[0] || "Unknown"
                    },
                    collaboration: {
                        review_participation: (totals.professional.collaboration.review / collabDenom).toFixed(2),
                        mentoring_culture: getTopK(totals.professional.collaboration.mentoring, 1)[0] || "Neutral"
                    },
                    growth: {
                        dominant_vibe: getTopK(totals.professional.growth.vibes, 1)[0] || "Unknown",
                        skill_signals: getTopK(totals.professional.growth.signals, 5)
                    },
                    churn: {
                        avg_age_days: totals.professional.churn.dates.length > 0
                            ? ((Date.now() - (totals.professional.churn.dates.reduce((a, b) => a + b, 0) / totals.professional.churn.dates.length)) / (1000 * 60 * 60 * 24)).toFixed(1)
                            : "Unknown",
                        unique_authors: totals.professional.churn.authors.size
                    }
                },
                resilience_report: {
                    error_discipline_score: (totals.resilience_forensics.error_discipline / resDenom).toFixed(2),
                    defensive_posture_score: (totals.resilience_forensics.defensive_posture / resDenom).toFixed(2),
                    optimization_score: (totals.resilience_forensics.optimization_score / resDenom).toFixed(2),
                    common_antipatterns: getTopK(totals.resilience_forensics.antipatterns, 5)
                }
            },
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
            extended_metadata: {
                dimensions: { social: "0.00", security: "0.00", testability: "0.00" },
                semantic: {
                    top_contexts: [],
                    top_frameworks: [],
                    dominant_maturity: "Unknown",
                    common_tradeoffs: []
                },
                professional: {
                    quality: { cyclomatic: "0.00", debt_ratio: "0.00", maintainability: "0.00" },
                    ecosystem: { top_tools: [], dominant_strategy: "Unknown" },
                    collaboration: { review_participation: "0.00", mentoring_culture: "Neutral" },
                    growth: { dominant_vibe: "Unknown", skill_signals: [] },
                    churn: { avg_age_days: "Unknown", unique_authors: 0 }
                },
                resilience_report: {
                    error_discipline_score: "0.00",
                    defensive_posture_score: "0.00",
                    optimization_score: "0.00",
                    common_antipatterns: []
                }
            },
            timestamp: new Date().toISOString()
        };
    }
}
