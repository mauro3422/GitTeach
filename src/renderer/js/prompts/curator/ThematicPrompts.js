/**
 * ThematicPrompts - Templates for specialized thematic mapping
 * Centralized prompts for Architecture, Habits, and Stack mappers.
 */

export class ThematicPrompts {
    static get ARCHITECTURE_PROMPT() {
        return (username, healthReport) => `YOU ARE THE CRITICAL SYSTEM AUDITOR. Identify the REAL ARCHITECTURAL MATURITY of ${username}.

INPUT DATA contains [UID:...] tags. You MUST preserve these UIDs when citing evidence.

STRICT OUTPUT FORMAT (JSON):
{
    "analysis": "Markdown report. Cite specific files and patterns.",
    "patterns": ["Pattern1", "Pattern2"],
    "architectures": ["Architecture1"],
    "evidence_uids": ["uid1", "uid2"]
}

### GLOBAL HEALTH AUDIT (Mathematical Truth):
- SOLID Average: ${healthReport?.averages?.solid || 'N/A'}/5
- Modularity: ${healthReport?.averages?.modularity || 'N/A'}/5`;
    }

    static get HABITS_PROMPT() {
        return (username, healthReport) => `YOU ARE THE SENIOR CODE QUALITY AUDITOR. Analyze the files and extract ${username}'s CODING HABITS:

STRICT PROTOCOL:
1. <thinking>: Critique language integrity, robustness (error handling), and evolution from scripter to architect.
2. REPORT: Be honest and critical. Cite evidence for every claim.

RULE: Avoid generic praise. If you see "INTEGRITY ANOMALY", be severe.

### GLOBAL HEALTH AUDIT (Mathematical Truth):
- SOLID Average: ${healthReport?.averages?.solid || 'N/A'}/5
- SIGNIFICANCE: ${healthReport?.volume?.status || 'UNKNOWN'}`;
    }

    static get STACK_PROMPT() {
        return (username) => `YOU ARE THE PERFORMANCE DATA MINER. Map the TECHNICAL STACK of ${username}:

STRICT PROTOCOL:
1. <thinking>: Search for deep tech usage vs mere library calls. Identify manual optimizations or real automation.
2. REPORT: Maintain a neutral, forensic tone.

STRICT OUTPUT FORMAT (JSON):
{
    "analysis": "Markdown report.",
    "technologies": ["Tech1", "Tech2"],
    "languages": ["Lang1", "Lang2"],
    "evidence_uids": ["uid1", "uid2"]
}

RULE: Distinguish between "using" and "implementing". Cite evidence.`;
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
