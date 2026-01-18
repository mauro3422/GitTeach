/**
 * MetricAggregatorOrchestrator - Coordinates all metric aggregators
 * Manages the aggregation pipeline and combines results from all domains
 */

import { LogicAggregator } from './LogicAggregator.js';
import { ProfessionalAggregator } from './ProfessionalAggregator.js';
import { ResilienceAggregator } from './ResilienceAggregator.js';
import { SemanticAggregator } from './SemanticAggregator.js';
import { KnowledgeAggregator } from './KnowledgeAggregator.js';

export class MetricAggregatorOrchestrator {
    constructor() {
        // Initialize all aggregators
        this.aggregators = {
            logic: new LogicAggregator(),
            professional: new ProfessionalAggregator(),
            resilience: new ResilienceAggregator(),
            semantic: new SemanticAggregator(),
            knowledge: new KnowledgeAggregator()
        };
    }

    /**
     * Execute full aggregation pipeline
     * @param {Array<MemoryNode>} nodes - Memory nodes to process
     * @param {number} totalFiles - Total files scanned
     * @returns {Object} Complete aggregated metrics report
     */
    aggregateAll(nodes, totalFiles = 0) {
        if (!nodes || !Array.isArray(nodes)) {
            return this._getEmptyReport();
        }

        const hasMeta = nodes.filter(n => n.metadata && Object.keys(n.metadata).length > 0).length;
        console.log(`[Orchestrator] Aggregating ${nodes.length} nodes (${hasMeta} with metadata)`);

        // Execute all aggregators in parallel
        const results = {};
        Object.entries(this.aggregators).forEach(([domain, aggregator]) => {
            try {
                results[domain] = aggregator.aggregate(nodes, totalFiles);
                console.log(`[Orchestrator] Domain ${domain} aggregated. Keys:`, Object.keys(results[domain]));
            } catch (error) {
                console.error(`Error in ${domain} aggregation:`, error);
                results[domain] = aggregator.getDefaultStructure();
            }
        });

        console.log(`[Orchestrator] Raw Results: Semantic.dimensions.social=${results.semantic?.dimensions?.social}, Resilience.optimization=${results.resilience?.optimization_score}`);

        // Build final report
        const report = {
            // Logic health metrics
            logic_health: {
                solid: results.logic.solid,
                modularity: results.logic.modularity,
                complexity: results.logic.complexity
            },

            // Knowledge health
            knowledge_health: {
                clarity: results.knowledge.clarity,
                discipline: results.knowledge.discipline,
                depth: results.knowledge.depth
            },

            // Seniority signals (derived from multiple aggregators)
            seniority_signals: {
                semantic: results.semantic?.dimensions?.social || "0.00",
                resilience: results.resilience?.defensive_posture_score || "0.00",
                resources: results.resilience?.optimization_score || "0.00", // Map to optimization
                auditability: results.resilience?.error_discipline_score || "0.00",
                domain_fidelity: results.resilience?.domain_fidelity_score || "0.00"
            },

            // Volume statistics
            volume: {
                analyzedFiles: nodes.length,
                totalFiles: totalFiles,
                coverage: totalFiles > 0 ? ((nodes.length / totalFiles) * 100).toFixed(1) + '%' : '100%',
                status: this._getVolumeStatus(nodes.length, totalFiles > 0 ? (nodes.length / totalFiles) * 100 : 100)
            },

            // Extended metadata combining all domains
            extended_metadata: {
                dimensions: results.semantic.dimensions,
                semantic: {
                    top_contexts: results.semantic.contexts.top_contexts,
                    top_frameworks: results.semantic.dependencies.top_frameworks,
                    dominant_maturity: results.semantic.dependencies.dominant_maturity,
                    common_tradeoffs: results.semantic.design.common_tradeoffs
                },
                professional: results.professional,
                resilience_report: {
                    error_discipline_score: results.resilience.error_discipline_score,
                    defensive_posture_score: results.resilience.defensive_posture_score,
                    optimization_score: results.resilience.optimization_score,
                    common_antipatterns: results.resilience.common_antipatterns
                }
            },

            timestamp: new Date().toISOString()
        };

        // Compatibility fix for older synthesizers
        report.averages = {
            solid: report.logic_health.solid,
            modularity: report.logic_health.modularity,
            readability: report.knowledge_health.clarity,
            complexity: report.logic_health.complexity
        };

        // Add domains info (placeholder for now)
        report.domains = this._extractDomains(nodes);

        return report;
    }

    /**
     * Get a specific aggregator
     * @param {string} domain - Domain name
     * @returns {IMetricAggregator|null} The aggregator or null if not found
     */
    getAggregator(domain) {
        return this.aggregators[domain] || null;
    }

    /**
     * Get all available domains
     * @returns {Array<string>} List of domain names
     */
    getAvailableDomains() {
        return Object.keys(this.aggregators);
    }

    /**
     * Validate that all aggregators are properly initialized
     * @returns {boolean} True if all aggregators are valid
     */
    validateAggregators() {
        return Object.values(this.aggregators).every(aggregator =>
            aggregator && typeof aggregator.aggregate === 'function'
        );
    }

    /**
     * Extract domain information from nodes
     * @param {Array<MemoryNode>} nodes - Nodes to analyze
     * @returns {Object} Domain frequency map
     */
    _extractDomains(nodes) {
        const domains = new Map();

        nodes.forEach(node => {
            const classification = node.classification || 'General';
            domains.set(classification, (domains.get(classification) || 0) + 1);
        });

        return Object.fromEntries(domains);
    }

    /**
     * Determine volume status based on coverage
     * @param {number} count - Number of files analyzed
     * @param {number} coverage - Coverage percentage
     * @returns {string} Status string
     */
    _getVolumeStatus(count, coverage) {
        if (count < 5) return 'EXPERIMENTAL';
        if (coverage < 10) return 'SURFACE';
        if (coverage < 40) return 'ESTABLISHED';
        return 'DEEP';
    }

    /**
     * Get empty report structure for when no data is available
     * @returns {Object} Empty report structure
     */
    _getEmptyReport() {
        return {
            logic_health: { solid: "0.00", modularity: "0.00", complexity: "0.00" },
            knowledge_health: { clarity: "0.00", discipline: "0.00", depth: "0.00" },
            seniority_signals: {
                semantic: "0.00",
                resilience: "0.00",
                resources: "0.00",
                auditability: "0.00",
                domain_fidelity: "0.00"
            },
            averages: { solid: "0.00", modularity: "0.00", readability: "0.00", complexity: "0.00" },
            volume: {
                analyzedFiles: 0,
                totalFiles: 0,
                coverage: '0%',
                status: 'EMPTY'
            },
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
