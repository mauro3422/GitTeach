/**
 * SystemPromptBuilder - Builds system prompts for AI code analysis
 * Extracted from WorkerPromptBuilder to comply with SRP
 *
 * Responsibilities:
 * - Build comprehensive system prompts for technical profiling
 * - Define analysis protocols and scoring methodologies
 * - Specify response structures and evaluation criteria
 */

export class SystemPromptBuilder {
    /**
     * Build the system prompt for code analysis
     * @returns {string} Complete system prompt
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

### 3. PROFESSIONAL CONTEXT (Inference):
- **Code Quality**: Estimating complexity, debt ratio, and maintainability.
- **Ecosystem**: Detecting CI/CD (Actions/Docker), monitoring, and cloud-native signals.
- **Collaboration**: Mentoring indicators, review readiness, knowledge sharing tokens.
- **Growth**: Technology adoption speed (modernity) and professional maturity.

### 4. RICH SEMANTIC METADATA (The "Why" & "How"):
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
  "professional": {
     "code_quality": { "cyclomatic": 1-5, "debt_ratio": 0.0-1.0, "maintainability": 0-100 },
     "ecosystem": { "ci_cd": ["Tool"], "pushed_to": "Cloud/On-Prem/Unknown" },
     "collaboration": { "review_ready": 0-5, "mentoring": "High/Low" },
     "growth": { "learning_signals": ["String"], "seniority_vibe": "Junior/Mid/Senior" }
  },
  "dimensions": {
     "social": 0-5,
     "security": 0-5,
     "testability": 0-5
  }
}`;
    }

    /**
     * Get analysis protocol description
     * @returns {string} Protocol description
     */
    getProtocolDescription() {
        return "Semantic & Multidimensional protocol for technical profiling";
    }

    /**
     * Get scoring methodology
     * @returns {Object} Scoring methodology details
     */
    getScoringMethodology() {
        return {
            dualTrack: {
                logic: ["SOLID", "Modularity", "Complexity"],
                knowledge: ["Clarity", "Discipline", "Depth"]
            },
            senioritySignals: [
                "Resilience", "Auditability", "Domain Fidelity"
            ],
            dimensions: ["Social", "Security", "Testability"]
        };
    }

    /**
     * Validate system prompt structure
     * @param {string} prompt - System prompt to validate
     * @returns {boolean} True if valid structure
     */
    validatePromptStructure(prompt) {
        const requiredSections = [
            "DUAL-TRACK SCORING",
            "SENIORITY SIGNALS",
            "PROFESSIONAL CONTEXT",
            "RICH SEMANTIC METADATA",
            "MULTIDIMENSIONAL METRICS",
            "RESPONSE STRUCTURE"
        ];

        return requiredSections.every(section => prompt.includes(section));
    }
}
