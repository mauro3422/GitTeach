/**
 * ResponseSchema - JSON Schemas for AI Responses
 * Centralized schema definition for structured reliability
 */

export class ResponseSchema {
    /**
     * Get the JSON Schema for Code Analysis (Worker)
     * Matches the LFM2 response format
     * @returns {Object} JSON Schema
     */
    static get WORKER_ANALYSIS_SCHEMA() {
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
                },
                professional: {
                    type: "object",
                    properties: {
                        code_quality: {
                            type: "object",
                            properties: {
                                cyclomatic: { type: "number" },
                                debt_ratio: { type: "number" },
                                maintainability: { type: "number" }
                            }
                        },
                        ecosystem: {
                            type: "object",
                            properties: {
                                ci_cd: { type: "array", items: { type: "string" } },
                                strategy: { type: "string" }
                            }
                        },
                        collaboration: {
                            type: "object",
                            properties: {
                                review_ready: { type: "number" },
                                mentoring: { type: "string" }
                            }
                        },
                        growth: {
                            type: "object",
                            properties: {
                                learning_signals: { type: "array", items: { type: "string" } },
                                seniority_vibe: { type: "string" }
                            }
                        }
                    }
                }
            },
            required: ["thought", "domain", "confidence", "complexity", "summary", "evidence", "logic", "knowledge", "signals", "semantic", "dimensions", "professional"]
        };
    }
}
