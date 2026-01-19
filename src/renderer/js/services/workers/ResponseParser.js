/**
 * ResponseParser - Robust JSON parsing and fallback logic
 * Extracted from PromptTemplateManager to specialize in response parsing
 *
 * Responsibilities:
 * - Parse AI responses into structured data
 * - Handle fallback parsing for broken formats
 * - Apply programmatic caps for different file types
 * - Post-process summaries with anomaly tagging
 */

export class ResponseParser {
    /**
     * Parse AI response into structured data
     * @param {string} summary - Raw AI response
     * @param {string} filePath - Path of the file being analyzed
     * @returns {Object|null} Parsed data or null
     */
    parseResponse(summary, filePath = null) {
        const trimmed = summary.trim();

        // if (trimmed.toUpperCase().startsWith('SKIP') || trimmed.includes('[SKIP]')) {
        //     return { tool: 'skip' };
        // }

        let data = null;
        try {
            // Priority 1: Full JSON parse
            // LFM2 with response_format: 'json_object' should return pure JSON
            data = JSON.parse(trimmed);
        } catch (e) {
            // Priority 2: Regex extraction for JSON block
            const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    data = JSON.parse(jsonMatch[0]);
                } catch (innerE) {
                    // Priority 3: Scavenger Mode - Extract sub-blocks specifically
                    // This handles cases where the global object is broken but sub-objects are intact
                    data = this._scavengeBrokenJson(trimmed);
                }
            } else {
                data = this._scavengeBrokenJson(trimmed);
            }
        }

        if (data) {
            // Handle legacy 'metrics' or new 'logic/knowledge'
            const logic = data.logic || data.metrics || { solid: 0, modularity: 0, complexity: 0 };
            const knowledge = data.knowledge || { clarity: 0, discipline: 0, depth: 0 };
            const signals = data.signals || { semantic: 0, resilience: 0, resources: 0, auditability: 0, domain_fidelity: 0 };

            // Collect fragments for professional and dimensions if they are at top-level
            const professional = data.professional || {
                code_quality: data.code_quality,
                collaboration: data.collaboration,
                growth: data.growth,
                ecosystem: data.ecosystem
            };

            const dimensions = data.dimensions || {
                social: data.social,
                security: data.security,
                testability: data.testability
            };

            const semantic = data.semantic || {};
            const resilience_forensics = data.resilience_forensics || {};

            const cappedLogic = this._applyProgrammaticCaps(data.domain || "General", data.summary || "", data.thought || "", logic, filePath);

            return {
                tool: 'analysis',
                params: {
                    insight: data.summary || "Code analyzed",
                    technical_strength: data.domain || "General",
                    impact: data.evidence || "N/A",
                    confidence: data.confidence || 0.5,
                    complexity: data.complexity || 3,
                    metadata: {
                        ...cappedLogic,
                        knowledge,
                        signals,
                        semantic,
                        dimensions,
                        professional,
                        resilience_forensics,
                        // Preserve file system metadata if injected before
                        file_meta: data.file_meta || {}
                    },
                    thought: data.thought || ""
                }
            };
        }

        // Fallback for legacy or loose parsing
        return this._looseParse(trimmed, filePath);
    }

    /**
     * Scavenger Mode: Extract sub-blocks from a broken JSON string
     * handles both wrapped and flattened structures
     * @private
     */
    _scavengeBrokenJson(text) {
        const result = {};

        // 1. Direct block extraction (for wrapped structures)
        const blocks = ['logic', 'knowledge', 'signals', 'semantic', 'professional', 'resilience_forensics', 'dimensions'];

        blocks.forEach(block => {
            const regex = new RegExp(`"${block}"\\s*:\\s*(\\{[\\s\\S]*?\\})(?:\\s*,|\\s*\\})`);
            const match = text.match(regex);
            if (match) {
                try {
                    result[block] = JSON.parse(match[1]);
                } catch (e) {
                    try { result[block] = JSON.parse(match[1] + '}'); } catch (e2) { }
                }
            }
        });

        // 2. Fragment scavenging (for flattened or orphaned structures)
        // If professional wasn't found as a block, look for its children
        if (!result.professional) {
            result.professional = {};
            const profTiers = ['code_quality', 'collaboration', 'growth', 'ecosystem'];
            profTiers.forEach(tier => {
                const regex = new RegExp(`"${tier}"\\s*:\\s*(\\{[\\s\\S]*?\\})(?:\\s*,|\\s*\\})`);
                const match = text.match(regex);
                if (match) {
                    try { result.professional[tier] = JSON.parse(match[1]); } catch (e) {
                        try { result.professional[tier] = JSON.parse(match[1] + '}'); } catch (e2) { }
                    }
                }
            });
            // If nothing found, clean up
            if (Object.keys(result.professional).length === 0) delete result.professional;
        }

        // 3. Dimensions scavenging
        if (!result.dimensions) {
            const dims = ['social', 'security', 'testability'];
            const dimMatch = {};
            dims.forEach(dim => {
                const regex = new RegExp(`"${dim}"\\s*:\\s*(\\d+)`);
                const match = text.match(regex);
                if (match) dimMatch[dim] = parseInt(match[1]);
            });
            if (Object.keys(dimMatch).length > 0) result.dimensions = dimMatch;
        }

        // Basic top-level fields
        const domainMatch = text.match(/"domain"\s*:\s*"([^"]+)"/);
        if (domainMatch) result.domain = domainMatch[1];

        const summaryMatch = text.match(/"summary"\s*:\s*"([^"]+)"/);
        if (summaryMatch) result.summary = summaryMatch[1];

        return Object.keys(result).length > 0 ? result : null;
    }

    /**
     * Loose parsing fallback for broken formats
     * @param {string} text - Raw response text
     * @param {string} filePath - File path for context
     * @returns {Object|null} Parsed data or null
     */
    _looseParse(text, filePath = null) {
        const domainMatch = text.match(/\[([^\]]+)\]/);
        const insightMatch = text.match(/SUMMARY:\s*(.*)/i) || text.match(/Description:\s*(.*)/i);
        const evidenceMatch = text.match(/EVIDENCE:\s*(.*)/i) || text.match(/Evidence:\s*(.*)/i);

        if (domainMatch || insightMatch) {
            const domain = domainMatch ? domainMatch[1] : 'General';
            const insight = insightMatch ? insightMatch[1].substring(0, 150) : "Technical analysis";
            const evidence = evidenceMatch ? evidenceMatch[1] : 'See code';

            // FULL DEFAULT STRUCTURE for metadata
            const logic = { solid: 2, modularity: 2, readability: 2, patterns: [] };
            const knowledge = this.getDefaultKnowledge();
            const signals = this.getDefaultSignals();

            const cappedLogic = this._applyProgrammaticCaps(domain, insight, "", logic, filePath);

            return {
                tool: 'analysis',
                params: {
                    insight: insight,
                    technical_strength: domain,
                    impact: evidence,
                    confidence: 0.5,
                    complexity: 2,
                    metadata: {
                        ...cappedLogic,
                        knowledge,
                        signals,
                        professional: {},
                        semantic: {},
                        resilience_forensics: {},
                        file_meta: {}
                    }
                }
            };
        }
        return null;
    }

    /**
     * Post-process summary with anomaly tagging
     * @param {string} summary - AI response
     * @param {Object} langCheck - Language integrity check result
     * @returns {string} Processed summary
     */
    postProcessSummary(summary, langCheck) {
        // Ensure langCheck is safe
        if (langCheck && !langCheck.valid) {
            return `⚠️ INTEGRITY ANOMALY: ${langCheck.anomaly} | ${summary}`;
        }
        return summary;
    }

    /**
     * Internal helper to apply metric caps for scripts and documentation
     * @private
     * @param {string} domain - Detected domain
     * @param {string} summary - Summary text
     * @param {string} thought - Thought text
     * @param {Object} metrics - Metrics object
     * @param {string} filePath - File path
     * @returns {Object} Capped metrics
     */
    _applyProgrammaticCaps(domain, summary, thought, metrics, filePath = null) {
        if (!metrics) metrics = { solid: 0, modularity: 0, readability: 0, patterns: [] };

        const lowDomain = (domain || "").toLowerCase();
        const lowSummary = (summary || "").toLowerCase();
        const lowThought = (thought || "").toLowerCase();
        const lowPath = (filePath || "").toLowerCase();

        const isScript = lowDomain.includes('script') ||
            lowDomain.includes('testing') ||
            lowSummary.includes('playwright') ||
            lowPath.includes('test') ||
            lowPath.endsWith('.mjs') ||
            lowPath.endsWith('.spec.js');

        const isDoc = lowDomain.includes('doc') ||
            lowDomain.includes('metadata') ||
            lowThought.includes('documentation') ||
            lowPath.endsWith('.md') ||
            lowPath.endsWith('.txt');

        if (isScript || isDoc) {
            if (isDoc) {
                // Documentation should NOT have technical metrics (null = ignore in averages)
                metrics.solid = null;
                metrics.modularity = null;
                // Complexity is preserved (not capped) to value Information Architecture depth
            } else if (isScript) {
                metrics.solid = Math.min(metrics.solid, 2);
                metrics.modularity = Math.min(metrics.modularity, 2);
            }
        }
        return metrics;
    }

    /**
     * Check if response indicates file should be skipped
     * @param {string} response - Raw response
     * @returns {boolean} True if should skip
     */
    shouldSkip(response) {
        const trimmed = response.trim();
        return trimmed.toUpperCase().startsWith('SKIP') || trimmed.includes('[SKIP]');
    }

    /**
     * Extract domain from response text
     * @param {string} text - Response text
     * @returns {string|null} Extracted domain or null
     */
    extractDomain(text) {
        const match = text.match(/\[([^\]]+)\]/);
        return match ? match[1] : null;
    }

    /**
     * Extract summary from response text
     * @param {string} text - Response text
     * @returns {string|null} Extracted summary or null
     */
    extractSummary(text) {
        const match = text.match(/SUMMARY:\s*(.*)/i) || text.match(/Description:\s*(.*)/i);
        return match ? match[1].substring(0, 150) : null;
    }

    /**
     * Validate parsed response structure
     * @param {Object} response - Parsed response
     * @returns {boolean} True if valid
     */
    validateResponse(response) {
        if (!response || typeof response !== 'object') return false;
        if (response.tool === 'skip') return true;
        if (response.tool !== 'analysis') return false;

        const params = response.params;
        if (!params) return false;

        return params.insight && params.technical_strength && params.impact;
    }

    /**
     * Get default metrics structure
     * @returns {Object} Default metrics
     */
    getDefaultMetrics() {
        return {
            solid: 0,
            modularity: 0,
            readability: 0,
            patterns: []
        };
    }

    /**
     * Get default knowledge structure
     * @returns {Object} Default knowledge
     */
    getDefaultKnowledge() {
        return {
            clarity: 0,
            discipline: 0,
            depth: 0
        };
    }

    /**
     * Get default signals structure
     * @returns {Object} Default signals
     */
    getDefaultSignals() {
        return {
            semantic: 0,
            resilience: 0,
            resources: 0,
            auditability: 0,
            domain_fidelity: 0
        };
    }
}
