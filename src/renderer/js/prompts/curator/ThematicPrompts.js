/**
 * ThematicPrompts - Templates for specialized thematic mapping
 * Centralized prompts for Architecture, Habits, and Stack mappers.
 */

export class ThematicPrompts {
    static get ARCHITECTURE_PROMPT() {
        return (username, healthReport) => `<system_role>
YOU ARE THE CRITICAL SYSTEM AUDITOR. Identify the REAL ARCHITECTURAL MATURITY of ${username}.
</system_role>

<cognitive_vaccines>
- "Folder name != Logic Component" (Verify actual code structure).
- "Citing patterns requires evidence (UIDs)".
- "NEVER invent frameworks".
</cognitive_vaccines>

<source_data>
<health_metrics>
- SOLID Average: ${healthReport?.averages?.solid || 'N/A'}/5
- Modularity: ${healthReport?.averages?.modularity || 'N/A'}/5
</health_metrics>
</source_data>

<protocol>
STEP 1: Extract 3 specific structural patterns found in the provided insights.
STEP 2: Identify the main architecture (React, Node, etc.) based ONLY on dependencies and code samples.
STEP 3: Generate the JSON report.
</protocol>

<output_format>
JSON:
{
    "analysis": "Markdown report. Cite specific files and patterns.",
    "patterns": ["Pattern1", "Pattern2"],
    "architectures": ["Architecture1"],
    "evidence_uids": ["uid1", "uid2"]
}
</output_format>`;
    }

    static get HABITS_PROMPT() {
        return (username, healthReport) => `<system_role>
YOU ARE THE SENIOR CODE QUALITY AUDITOR. Analyze the files and extract ${username}'s CODING HABITS.
</system_role>

<cognitive_vaccines>
- "Seniority requires Error Discipline (not just code count)".
- "Avoid generic praise: be severe with anti-patterns".
- "NO hallucinations: if evidence is missing, state 'DATA SCARCE'".
</cognitive_vaccines>

<source_data>
<health_audit>
- SOLID Average: ${healthReport?.averages?.solid || 'N/A'}/5
- Significance: ${healthReport?.volume?.status || 'UNKNOWN'}
</health_audit>
</source_data>

<protocol>
STEP 1: Identify "Integrity Anomalies" (e.g., generic catches, hardcoded values).
STEP 2: Look for "Resilience Signals" (defensive programming patterns).
STEP 3: Generate analysis focused on the evolution from scripter to architect.
</protocol>

<output_format>
JSON:
{
    "analysis": "Markdown report.",
    "evidence_uids": ["uid1", "uid2"]
}
</output_format>`;
    }

    static get STACK_PROMPT() {
        return (username) => `<system_role>
YOU ARE THE PERFORMANCE DATA MINER. Map the TECHNICAL STACK of ${username}.
</system_role>

<cognitive_vaccines>
- "Importing != Implementing".
- "React is a UI library, NOT a backend framework".
- "NEVER invent tools not present in the insights".
</cognitive_vaccines>

<protocol>
STEP 1: Extract all 'technologies' and 'languages' referenced in the insights.
STEP 2: Filter out noise (generic packages) vs core stack components.
STEP 3: Generate the JSON report.
</protocol>

<output_format>
JSON:
{
    "analysis": "Markdown report.",
    "technologies": ["Tech1", "Tech2"],
    "languages": ["Lang1", "Lang2"],
    "evidence_uids": ["uid1", "uid2"]
}
</output_format>`;
    }

    static get ARCHITECTURE_SCHEMA() {
        return {
            type: "object",
            properties: {
                analysis: { type: "string" },
                patterns: { type: "array", items: { type: "string" } },
                architectures: { type: "array", items: { type: "string" } },
                evidence_uids: { type: "array", items: { type: "string" } }
            },
            required: ["analysis", "patterns", "architectures", "evidence_uids"]
        };
    }

    static get HABITS_SCHEMA() {
        return {
            type: "object",
            properties: {
                analysis: { type: "string" },
                evidence_uids: { type: "array", items: { type: "string" } }
            },
            required: ["analysis", "evidence_uids"]
        };
    }

    static get STACK_SCHEMA() {
        return {
            type: "object",
            properties: {
                analysis: { type: "string" },
                technologies: { type: "array", items: { type: "string" } },
                languages: { type: "array", items: { type: "string" } },
                evidence_uids: { type: "array", items: { type: "string" } }
            },
            required: ["analysis", "technologies", "languages", "evidence_uids"]
        };
    }
}
