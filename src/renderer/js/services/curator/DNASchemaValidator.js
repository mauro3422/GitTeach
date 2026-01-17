/**
 * DNASchemaValidator - JSON Schema validation for DNA objects
 * Extracted from DNASynthesizer to comply with SRP
 *
 * Responsibilities:
 * - Define and validate DNA JSON schema
 * - Provide schema definitions for different DNA components
 * - Validate AI-generated DNA against schema requirements
 */

export class DNASchemaValidator {
    /**
     * Get the complete DNA JSON Schema
     * @returns {Object} JSON Schema for technical DNA validation
     */
    getDNASchema() {
        return {
            type: "object",
            properties: {
                thought: { type: "string" },
                bio: { type: "string" },
                traits: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            score: { type: "integer" },
                            details: { type: "string" },
                            evidence: { type: "string" },
                            evidence_uids: { type: "array", items: { type: "string" } }
                        },
                        required: ["name", "score", "details", "evidence", "evidence_uids"]
                    }
                },
                distinctions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            signal: { type: "string" },
                            badge: { type: "string" },
                            justification: { type: "string" }
                        },
                        required: ["signal", "badge", "justification"]
                    }
                },
                signature_files: { type: "array", items: { type: "string" } },
                code_health: {
                    type: "object",
                    properties: {
                        logic_integrity: { type: "integer" },
                        knowledge_integrity: { type: "integer" },
                        details: { type: "string" }
                    },
                    required: ["logic_integrity", "knowledge_integrity", "details"]
                },
                verdict: { type: "string" },
                // NEW: Tech Radar & Extended Metadata
                tech_radar: {
                    type: "object",
                    properties: {
                        adopt: { type: "array", items: { type: "string" } },
                        trial: { type: "array", items: { type: "string" } },
                        assess: { type: "array", items: { type: "string" } },
                        hold: { type: "array", items: { type: "string" } }
                    }
                },
                extended_metadata: {
                    type: "object",
                    properties: {
                        social_score: { type: "number" },
                        security_score: { type: "number" },
                        testability_score: { type: "number" },
                        dominant_stack_maturity: { type: "string" }
                    }
                },
                professional_context: {
                    type: "object",
                    properties: {
                        quality_index: { type: "string" }, // e.g. "High (78%)"
                        ecosystem_profile: { type: "string" },
                        collaboration_style: { type: "string" },
                        seniority_vibe: { type: "string" },
                        code_churn: { type: "string" }
                    }
                }
            },
            required: ["thought", "bio", "traits", "distinctions", "signature_files", "code_health", "verdict", "tech_radar", "professional_context"]
        };
    }

    /**
     * Get schema for individual traits
     * @returns {Object} Trait schema
     */
    getTraitSchema() {
        return {
            type: "object",
            properties: {
                name: { type: "string" },
                score: { type: "integer", minimum: 0, maximum: 100 },
                details: { type: "string" },
                evidence: { type: "string" },
                evidence_uids: {
                    type: "array",
                    items: { type: "string" }
                }
            },
            required: ["name", "score", "details", "evidence", "evidence_uids"]
        };
    }

    /**
     * Get schema for distinctions/badges
     * @returns {Object} Distinction schema
     */
    getDistinctionSchema() {
        return {
            type: "object",
            properties: {
                signal: { type: "string" },
                badge: { type: "string" },
                justification: { type: "string" }
            },
            required: ["signal", "badge", "justification"]
        };
    }

    /**
     * Get schema for tech radar categorization
     * @returns {Object} Tech radar schema
     */
    getTechRadarSchema() {
        return {
            type: "object",
            properties: {
                adopt: { type: "array", items: { type: "string" } },
                trial: { type: "array", items: { type: "string" } },
                assess: { type: "array", items: { type: "string" } },
                hold: { type: "array", items: { type: "string" } }
            }
        };
    }

    /**
     * Validate DNA object against schema
     * @param {Object} dna - DNA object to validate
     * @returns {Object} Validation result {valid: boolean, errors: Array}
     */
    validateDNA(dna) {
        const errors = [];

        if (!dna || typeof dna !== 'object') {
            errors.push("DNA must be an object");
            return { valid: false, errors };
        }

        // Required fields validation
        const requiredFields = ["thought", "bio", "traits", "distinctions", "signature_files", "code_health", "verdict", "tech_radar"];
        for (const field of requiredFields) {
            if (!(field in dna)) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Thought validation
        if (typeof dna.thought !== 'string' || dna.thought.trim().length === 0) {
            errors.push("Thought must be a non-empty string");
        }

        // Bio validation
        if (typeof dna.bio !== 'string' || dna.bio.trim().length === 0) {
            errors.push("Bio must be a non-empty string");
        }

        // Traits validation
        if (!Array.isArray(dna.traits)) {
            errors.push("Traits must be an array");
        } else {
            dna.traits.forEach((trait, index) => {
                if (!trait.name || typeof trait.name !== 'string') {
                    errors.push(`Trait ${index}: name must be a non-empty string`);
                }
                if (typeof trait.score !== 'number' || trait.score < 0 || trait.score > 100) {
                    errors.push(`Trait ${index}: score must be a number between 0-100`);
                }
                if (!trait.details || typeof trait.details !== 'string') {
                    errors.push(`Trait ${index}: details must be a non-empty string`);
                }
                if (!trait.evidence || typeof trait.evidence !== 'string') {
                    errors.push(`Trait ${index}: evidence must be a non-empty string`);
                }
                if (!Array.isArray(trait.evidence_uids)) {
                    errors.push(`Trait ${index}: evidence_uids must be an array`);
                }
            });
        }

        // Distinctions validation
        if (!Array.isArray(dna.distinctions)) {
            errors.push("Distinctions must be an array");
        } else {
            dna.distinctions.forEach((distinction, index) => {
                if (!distinction.signal || typeof distinction.signal !== 'string') {
                    errors.push(`Distinction ${index}: signal must be a non-empty string`);
                }
                if (!distinction.badge || typeof distinction.badge !== 'string') {
                    errors.push(`Distinction ${index}: badge must be a non-empty string`);
                }
                if (!distinction.justification || typeof distinction.justification !== 'string') {
                    errors.push(`Distinction ${index}: justification must be a non-empty string`);
                }
            });
        }

        // Signature files validation
        if (!Array.isArray(dna.signature_files)) {
            errors.push("Signature files must be an array");
        }

        // Code health validation
        if (dna.code_health) {
            if (typeof dna.code_health.logic_integrity !== 'number' ||
                dna.code_health.logic_integrity < 0 || dna.code_health.logic_integrity > 100) {
                errors.push("Code health logic_integrity must be a number between 0-100");
            }
            if (typeof dna.code_health.knowledge_integrity !== 'number' ||
                dna.code_health.knowledge_integrity < 0 || dna.code_health.knowledge_integrity > 100) {
                errors.push("Code health knowledge_integrity must be a number between 0-100");
            }
        }

        // Verdict validation
        if (typeof dna.verdict !== 'string' || dna.verdict.trim().length === 0) {
            errors.push("Verdict must be a non-empty string");
        }

        // Tech radar validation
        if (dna.tech_radar) {
            const radarFields = ['adopt', 'trial', 'assess', 'hold'];
            radarFields.forEach(field => {
                if (dna.tech_radar[field] && !Array.isArray(dna.tech_radar[field])) {
                    errors.push(`Tech radar ${field} must be an array`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitize DNA object to ensure it conforms to schema
     * @param {Object} dna - DNA object to sanitize
     * @returns {Object} Sanitized DNA object
     */
    sanitizeDNA(dna) {
        if (!dna || typeof dna !== 'object') {
            return this.createMinimalDNA();
        }

        const sanitized = { ...dna };

        // Ensure required fields exist
        if (!sanitized.thought) sanitized.thought = "Analysis completed.";
        if (!sanitized.bio) sanitized.bio = "Technical profile synthesized.";
        if (!Array.isArray(sanitized.traits)) sanitized.traits = [];
        if (!Array.isArray(sanitized.distinctions)) sanitized.distinctions = [];
        if (!Array.isArray(sanitized.signature_files)) sanitized.signature_files = [];
        if (!sanitized.code_health) sanitized.code_health = {
            logic_integrity: 0,
            knowledge_integrity: 0,
            details: "Analysis completed."
        };
        if (!sanitized.verdict) sanitized.verdict = "Technical Developer";
        if (!sanitized.tech_radar) sanitized.tech_radar = {
            adopt: [], trial: [], assess: [], hold: []
        };

        // Sanitize traits
        sanitized.traits = sanitized.traits.filter(trait =>
            trait && typeof trait === 'object' && trait.name
        ).map(trait => ({
            name: String(trait.name || 'Unknown'),
            score: Math.max(0, Math.min(100, Number(trait.score) || 0)),
            details: String(trait.details || ''),
            evidence: String(trait.evidence || ''),
            evidence_uids: Array.isArray(trait.evidence_uids) ? trait.evidence_uids : []
        }));

        // Sanitize distinctions
        sanitized.distinctions = sanitized.distinctions.filter(dist =>
            dist && typeof dist === 'object' && dist.badge
        ).map(dist => ({
            signal: String(dist.signal || ''),
            badge: String(dist.badge),
            justification: String(dist.justification || '')
        }));

        return sanitized;
    }

    /**
     * Create minimal valid DNA object
     * @returns {Object} Minimal DNA object
     */
    createMinimalDNA() {
        return {
            thought: "Minimal DNA synthesis completed.",
            bio: "Basic technical profile created.",
            traits: [],
            distinctions: [],
            signature_files: [],
            code_health: {
                logic_integrity: 0,
                knowledge_integrity: 0,
                details: "Minimal analysis."
            },
            verdict: "Developer",
            tech_radar: {
                adopt: [], trial: [], assess: [], hold: []
            }
        };
    }

    /**
     * Check if DNA has required fields for basic functionality
     * @param {Object} dna - DNA object to check
     * @returns {boolean} True if DNA has required fields
     */
    hasRequiredFields(dna) {
        return dna &&
            typeof dna === 'object' &&
            dna.bio &&
            Array.isArray(dna.traits) &&
            dna.verdict;
    }
}
