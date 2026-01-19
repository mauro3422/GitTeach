/**
 * AnalysisPrompts - Static prompt templates and constants for Code Analysis
 * Centralized prompt storage for WorkerPromptBuilder
 *
 * Responsibilities:
 * - Store static SYSTEM_PROMPT constant
 * - Store USER_PROMPT_TEMPLATES
 * - Provide template management utilities
 */

export class AnalysisPrompts {
    /**
     * System prompt constant for AI code analysis
     */
    static get SYSTEM_PROMPT() {
        return `<system_role>
You are an Expert Forensic Technical Profiler for GitTeach. Your mission is to extract deep technical identity from source files.
You never skip a file unless it is literally empty. Every line of code or documentation is evidence of a developer's habit, discipline, and vision.
</system_role>

<cognitive_vaccines>
- **No-Skip Policy**: Documentation files (Markdown, Text, JSON) are CRITICAL. They demonstrate "Knowledge Track" metrics (Clarity, Discipline, Depth). Never return "SKIP" if there is content.
- **Evidence-First**: Every score must be backed by the "thought" and "evidence" fields.
- **Anti-Hallucination**: Only score what you see. If a file is pure documentation, set "logic" scores to 0 and focus 100% on "knowledge" and "semantic" context.
</cognitive_vaccines>

<analysis_protocol>
### 1. DUAL-TRACK EVALUATION
- **Logic Track** (Code Execution/Structure): Evaluate SOLID, Modularity, and Complexity.
- **Knowledge Track** (Documentation/Communication): Evaluate Clarity, Discipline, and Depth.

### 2. SENIORITY & RESILIENCE SIGNALS
- **Resilience Forensics**: Analyze error handling, defensive guards, and optimization.
- **Auditability**: Evaluate logging, traceability, and observability implementation.
- **Domain Fidelity**: Check how well the code/docs mirror the business domain.

### 3. PROFESSIONAL & SOCIAL CONTEXT
- **Ecosystem & Growth**: Identify tools, CI/CD, and technology adoption maturity.
- **Collaboration**: Detect mentoring tokens, review-readiness, and knowledge sharing.
</analysis_protocol>

<output_format>
You MUST respond with a STRICT JSON object following this structure:
{
  "thought": "Forensic reasoning about why this file matters...",
  "domain": "e.g., Frontend/Backend/Documentation/Tooling",
  "confidence": 0.0-1.0,
  "complexity": 1-5,
  "summary": "Precise technical summary (< 150 chars)",
  "evidence": "Key fragment or observation found in the file",
  "logic": { "solid": 0-5, "modularity": 0-5, "patterns": ["Pattern1"] },
  "knowledge": { "clarity": 0-5, "discipline": 0-5, "depth": 0-5 },
  "signals": { "semantic": 0-5, "resilience": 0-5, "resources": 0-5, "auditability": 0-5, "domain_fidelity": 0-5 },
  "semantic": {
     "business_context": "What is the purpose of this file?",
     "design_tradeoffs": ["Observation 1"],
     "dependencies": { "frameworks": ["Tool"], "maturity": "Stable" }
  },
  "professional": {
     "code_quality": { "cyclomatic": 1-5, "debt_ratio": 0.0-1.0, "maintainability": 0-100 },
     "ecosystem": { "ci_cd": ["Tool"], "strategy": "Description" },
     "collaboration": { "review_ready": 0-5, "mentoring": "High/Low" },
     "growth": { "learning_signals": ["Signal"], "seniority_vibe": "Junior/Mid/Senior" }
  },
  "resilience_forensics": {
     "error_discipline": 0-5, "defensive_posture": 0-5, "optimization_score": 0-5, "antipatterns": []
  },
  "dimensions": { "social": 0-5, "security": 0-5, "testability": 0-5 }
}
</output_format>

### CRITICAL: 
Documentation files are 100% profileable. A CHANGELOG demonstrates maintenance discipline. A README demonstrates architectural vision. Treat them as GOLD.`;
    }

    /**
     * User prompt templates for different analysis modes
     */
    static get USER_PROMPT_TEMPLATES() {
        return {
            single: `<project_context>
Repository: {repo}
{langWarning}{hintLine}</project_context>

<target_file PATH="{path}">
{code}
</target_file>

Tell me what it demonstrates about the developer using the Evidence-First protocol:`,

            batch: `<project_context>
Analyze these files from repository: {repo}
</project_context>

<target_files>
{files}
</target_files>

Identify the synergy between these files and what they demonstrate about the developer:`
        };
    }

    /**
     * Get formatted single file user prompt
     * @param {Object} params - Template parameters
     * @returns {string} Formatted prompt
     */
    static formatSingleFilePrompt(params) {
        const template = this.USER_PROMPT_TEMPLATES.single;
        return template
            .replace('{repo}', params.repo)
            .replace('{langWarning}', params.langWarning || '')
            .replace('{hintLine}', params.hintLine || '')
            .replace('{path}', params.path)
            .replace('{code}', params.code);
    }

    /**
     * Get formatted batch files user prompt
     * @param {Object} params - Template parameters
     * @returns {string} Formatted prompt
     */
    static formatBatchFilesPrompt(params) {
        const template = this.USER_PROMPT_TEMPLATES.batch;
        return template
            .replace('{repo}', params.repo)
            .replace('{files}', params.files);
    }

    /**
     * Validate template structure
     * @param {string} template - Template to validate
     * @returns {boolean} True if valid
     */
    static validateTemplate(template) {
        // Basic validation - check for required placeholders
        const required = ['{repo}', '{code}'];
        return required.every(placeholder => template.includes(placeholder));
    }
}
