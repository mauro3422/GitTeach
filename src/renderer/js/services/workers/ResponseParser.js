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

        if (trimmed.toUpperCase().startsWith('SKIP') || trimmed.includes('[SKIP]')) {
            return { tool: 'skip' };
        }

        try {
            // LFM2 with response_format: 'json_object' should return pure JSON
            const data = JSON.parse(trimmed);

            if (data.domain && (data.logic || data.metrics)) {
                // Handle legacy 'metrics' or new 'logic/knowledge'
                const logic = data.logic || data.metrics || {};
                const knowledge = data.knowledge || { clarity: 0, discipline: 0, depth: 0 };
                const signals = data.signals || { semantic: 0, resilience: 0, resources: 0, auditability: 0, domain_fidelity: 0 };
                // NEW: Capture semantic, dimensions, and professional context
                const semantic = data.semantic || {};
                const dimensions = data.dimensions || {};
                const professional = data.professional || {};
                const resilience_forensics = data.resilience_forensics || {};

                const cappedLogic = this._applyProgrammaticCaps(data.domain, data.summary || "", data.thought || "", logic, filePath);

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
                        thought: data.thought
                    }
                };
            }
        } catch (e) {
            // Fallback for cases where model might still wrap JSON in markers
            const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const data = JSON.parse(jsonMatch[0]);
                    const logic = data.logic || data.metrics || { solid: 0 };
                    const knowledge = data.knowledge || { clarity: 0 };
                    const signals = data.signals || { semantic: 0 };

                    const cappedLogic = this._applyProgrammaticCaps(data.domain || "General", data.summary || "", data.thought || "", logic, filePath);
                    return {
                        tool: 'analysis',
                        params: {
                            insight: data.summary || "Technical analysis",
                            technical_strength: data.domain || "General",
                            impact: data.evidence || "See code",
                            confidence: data.confidence || 0.6,
                            complexity: data.complexity || 2,
                            metadata: {
                                ...cappedLogic,
                                knowledge,
                                signals
                            },
                            thought: data.thought || ""
                        }
                    };
                } catch (innerE) { }
            }
        }

        // Fallback for legacy or loose parsing
        return this._looseParse(trimmed, filePath);
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
            const metrics = { solid: 2, modularity: 2, readability: 2, patterns: [] };

            const cappedMetrics = this._applyProgrammaticCaps(domain, insight, "", metrics, filePath);

            return {
                tool: 'analysis',
                params: {
                    insight: insight,
                    technical_strength: domain,
                    impact: evidence,
                    confidence: 0.5,
                    complexity: 2,
                    metadata: cappedMetrics
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
        if (!langCheck.valid) {
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
