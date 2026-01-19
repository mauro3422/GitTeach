/**
 * ProfilePromptBuilder
 * Specialized Prompt Engineering for "Personal Branding" agent.
 *
 * Focus:
 * - REALISM: No "npm install" for a user profile.
 * - IDENTITY: "Who am I?", "What do I love?", "How do I code?".
 * - SHOWCASE: Visuals > Text.
 */
export const ProfilePromptBuilder = {

    /**
     * STEP 1: DRAFT (Reflection)
     * Takes the raw DNA (technical_identity.json) and drafts the content sections.
     */
    getDraftPrompt(username, identity) {
        return `SYSTEM: You are a World-Class Technical Recruiter and Personal Branding Expert.
Your client is "${username}". 

=== COGNITIVE VACCINES ===
- "DO NOT invent skills (e.g., if no Rust files, DO NOT say Rust expert)".
- "Documentation != Product" (Focus on the developer, not project setup).
- "NO 'npm install' instructions".

=== SOURCE MATERIAL (DNA) ===
<developer_dna>
${JSON.stringify(identity, null, 2)}
</developer_dna>

=== PROTOCOL ===
STEP 1: Extract the top 3 strengths from 'habits' and 'philosophy'.
STEP 2: Map the actual 'stack_proficiency' from the data.
STEP 3: Compose the markdown sections.

=== SECTIONS ===
- **Bio/Intro**: A 2-line hook about who they are.
- **Philosophy**: 3 bullet points on how they approach code.
- **Tech Stack**: Grouped logically (Languages, Frameworks, Tools).
- **Recent Highlights**: Mention 1-2 key repos if available in the DNA.

OUTPUT: Markdown content.
`;
    },

    /**
     * STEP 2: CRITIQUE (The Mirror)
     * Compares the Draft against the Hard Data to catch hallucinations or boring text.
     */
    getCritiquePrompt(draft, identity) {
        return `<system_role>
You are the "Truth Anchor". You critique personal profiles for validity.
</system_role>

<hard_data>
${JSON.stringify(identity, null, 2)}
</hard_data>

<draft_to_review>
${draft}
</draft_to_review>

<task>
Critique the draft. Answer these questions:
1. **Validity**: Does the draft claim skills not present in the Hard Data? (CRITICAL: Every mentioned tech/skill MUST have a corresponding entry in the DNA).
2. **Relevance**: Did it accidentally include "npm install", documentation headers, or project-setup steps? (This is a USER profile, not a project readme).
3. **Voice**: Does it sound like a specific, data-driven developer or a generic template?
</task>

<output_format>
JSON:
{
  "valid": boolean,
  "critique": "Specific feedback on what to fix...",
  "correction_needed": boolean
}
</output_format>`;
    },

    /**
     * STEP 3: FINALIZE (Polish)
     * Applies formatting, emojis, and structure.
     */
    getFinalizePrompt(draft, critique) {
        return `<system_role>
You are a Markdown Artist. Your job is to take content and make it visually STUNNING.
</system_role>

<draft_content>
${draft}
</draft_content>

<critique_feedback>
(Apply these fixes):
${critique}
</critique_feedback>

<visual_guidelines>
- Use Badges (shields.io style text) for stacks.
- Use Emojis for headers.
- Use a clear, centered layout for the header.
- **NO "npm install"**.
</visual_guidelines>

<output_format>
Final README.md code block.
</output_format>`;
    }
};
