/**
 * WorkerPromptBuilder - Builds prompts for AI code analysis
 * Extracted from AIWorkerPool to comply with SRP
 * 
 * Responsibilities:
 * - Build system prompts for code analysis
 * - Build user prompts with domain hints and language checks
 * - Pre-filter files that should be skipped
 * - Parse AI responses into structured data
 */
import { FileClassifier } from '../../utils/fileClassifier.js';

export class WorkerPromptBuilder {
    /**
     * Build the system prompt for code analysis
     */
    buildSystemPrompt() {
        return `You are a Senior Technical Profiler for GitTeach. Analyze code files using the "Semantic & Multidimensional" protocol.

### 1. DUAL-TRACK SCORING (Technical Base):
- **Logic Track** (Code Only): Evaluate SOLID, Modularity, and Complexity.
- **Knowledge Track** (Docs & Comments): Evaluate Clarity, Discipline, and Depth.

### 2. SENIORITY SIGNALS (Score 0-5):
- **Resilience**: Defensive programming, error management.
- **Auditability**: Quality of logs and traceability.
- **Domain Fidelity**: Alignment between code structure and business logic.

### 3. RICH SEMANTIC METADATA (The "Why" & "How"):
- **Business Context**: Infer the purpose (e.g., "Payment Gateway", "Auth Service").
- **Constraints**: Constraints detected (e.g., "Legacy DB", "High Performance").
- **Stack Ecology**: Detect tech version/maturity (e.g., "React 18+", "Legacy ES5").

### 4. MULTIDIMENSIONAL METRICS (Human/Team):
- **Social**: Collaboration readiness (clear comments for teammates, TODOs).
- **Security**: Defensive posture (input validation, sanitization).
- **Testability**: Design facilitates testing (dependency injection, pure functions).

### RESPONSE STRUCTURE (STRICT JSON):
You must respond with:
{
  "thought": "Internal reasoning...",
  "domain": "Technical domain",
  "confidence": 0.0-1.0,
  "complexity": 1-5,
  "summary": "< 150 chars",
  "evidence": "Code fragment",
  "logic": { "solid": 0-5, "modularity": 0-5, "patterns": ["Pattern1", "Pattern2"] },
  "knowledge": { "clarity": 0-5, "discipline": 0-5, "depth": 0-5 },
  "signals": { "semantic": 0-5, "resilience": 0-5, "resources": 0-5, "auditability": 0-5, "domain_fidelity": 0-5 },
  "semantic": {
     "business_context": "String",
     "design_tradeoffs": ["String"],
     "dependencies": { "frameworks": ["String"], "maturity": "Stable/Legacy/Bleeding" }
  },
  "dimensions": {
     "social": 0-5,
     "security": 0-5,
     "testability": 0-5
  }
}`;
    }

    /**
     * Build the user prompt for a file or batch
     * @param {Object} input - Single item or batch object
     * @returns {Object} { prompt: string, skipReason: string|null }
     */
    buildUserPrompt(input) {
        const isBatch = input.isBatch;
        const items = isBatch ? input.items : [input];
        const repo = items[0].repo;

        // Pre-filter check
        const skipCheck = FileClassifier.shouldSkip(items[0].path, items[0].content);
        if (skipCheck.skip && !isBatch) {
            return { prompt: null, skipReason: skipCheck.reason };
        }

        // Get domain hint from FileClassifier
        const domainHint = FileClassifier.getDomainHint(items[0].path, items[0].content);

        // Validate language integrity (detect Python in .js, etc.)
        const langCheck = FileClassifier.validateLanguageIntegrity(items[0].path, items[0].content);
        const langWarning = langCheck.valid ? '' : `\n⚠️ ANOMALY DETECTED: ${langCheck.anomaly}. Report this mismatch.\n`;

        let userPrompt;

        if (isBatch) {
            userPrompt = `<project_context>\nAnalyze these files from repository: ${repo}\n</project_context>\n\n<target_files>\n`;
            items.forEach((item) => {
                userPrompt += `\n--- FILE: ${item.path} ---\n\`\`\`\n${item.content.substring(0, 800)}\n\`\`\`\n`;
            });
            userPrompt += `</target_files>\n\nIdentify the synergy between these files and what they demonstrate about the developer:`;
        } else {
            const hintLine = domainHint ? `SUGGESTED DOMAIN: ${domainHint}\n` : '';
            userPrompt = `<project_context>\n${langWarning}${hintLine}Repository: ${repo}\n</project_context>\n\n<target_file PATH="${items[0].path}">\n\`\`\`\n${items[0].content.substring(0, 3000)}\n\`\`\`\n</target_file>\n\nTell me what it demonstrates about the developer using the Evidence-First protocol:`;
        }

        return {
            prompt: userPrompt,
            skipReason: null,
            langCheck: langCheck
        };
    }

    /**
     * Get JSON Schema for validation (LFM2 Optimization)
     */
    getResponseSchema() {
        return {
            type: "object",
            properties: {
                thought: { type: "string" },
                domain: { type: "string" },
                confidence: { type: "number" },
                complexity: { type: "integer" },
                summary: { type: "string" },
                evidence: { type: "string" },
                logic: {
                    type: "object",
                    properties: {
                        solid: { type: "integer" },
                        modularity: { type: "integer" },
                        patterns: { type: "array", items: { type: "string" } }
                    },
                    required: ["solid", "modularity", "patterns"]
                },
                knowledge: {
                    type: "object",
                    properties: {
                        clarity: { type: "integer" },
                        discipline: { type: "integer" },
                        depth: { type: "integer" }
                    },
                    required: ["clarity", "discipline", "depth"]
                },
                signals: {
                    type: "object",
                    properties: {
                        semantic: { type: "integer" },
                        resilience: { type: "integer" },
                        resources: { type: "integer" },
                        auditability: { type: "integer" },
                        domain_fidelity: { type: "integer" }
                    },
                    required: ["semantic", "resilience", "resources", "auditability", "domain_fidelity"]
                },
                semantic: {
                    type: "object",
                    properties: {
                        business_context: { type: "string" },
                        design_tradeoffs: { type: "array", items: { type: "string" } },
                        dependencies: {
                            type: "object",
                            properties: {
                                frameworks: { type: "array", items: { type: "string" } },
                                maturity: { type: "string" }
                            }
                        }
                    }
                },
                dimensions: {
                    type: "object",
                    properties: {
                        social: { type: "integer" },
                        security: { type: "integer" },
                        testability: { type: "integer" }
                    }
                }
            },
            required: ["thought", "domain", "confidence", "complexity", "summary", "evidence", "logic", "knowledge", "signals", "semantic", "dimensions"]
        };
    }

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
                // NEW: Capture semantic and dimensions
                const semantic = data.semantic || {};
                const dimensions = data.dimensions || {};

                const cappedLogic = this._applyProgrammaticCaps(data.domain, data.summary || "", data.thought || "", logic, filePath);

                return {
                    tool: 'analysis',
                    params: {
                        insight: data.summary,
                        technical_strength: data.domain,
                        impact: data.evidence,
                        confidence: data.confidence || 0.7,
                        complexity: data.complexity || 2,
                        metadata: {
                            ...cappedLogic,
                            knowledge,
                            signals,
                            semantic,
                            dimensions
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
}
