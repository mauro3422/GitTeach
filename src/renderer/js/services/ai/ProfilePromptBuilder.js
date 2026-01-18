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
Your client is "${username}". Your goal is to write the CORE CONTENT for their GitHub Profile README.

=== SOURCE MATERIAL (DNA) ===
${JSON.stringify(identity, null, 2)}

=== CRITICAL RULES ===
1. **NO PROJECT INSTRUCTIONS**: Do not write "How to install", "Usage", "Contributing". This is a USER profile, NOT a repo readme.
2. **FOCUS ON THE PERSON**:
   - What motivates them? (See 'habits' and 'philosophy')
   - What is their *actual* stack? (See 'stack_proficiency')
   - What are their strengths? (See 'solid_score' or 'architecture')
3. **TONE**: Professional, Passionate, but grounded in data. Avoid flattery.

=== REQUIRED SECTIONS (Generate Content Only) ===
- **Bio/Intro**: A 2-line hook about who they are.
- **Philosophy**: 3 bullet points on how they approach code (e.g., "Modular First", "Performance Obsessed").
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
        return `SYSTEM: You are the "Truth Anchor". You critique personal profiles for validity.

=== HARD DATA ===
${JSON.stringify(identity, null, 2)}

=== DRAFT TO REVIEW ===
${draft}

=== YOUR TASK ===
Critique the draft. Answer these questions:
1. **Validity**: Does the draft claim skills not present in the Hard Data? (e.g., claims Rust expert but 0 Rust files).
2. **Relevance**: Did it accidentally include "npm install" or project-setup steps? (Major Error).
3. **Voice**: Does it sound like a generic human or a specific developer based on the data?

OUTPUT: JSON
{
  "valid": boolean,
  "critique": "Specific feedback on what to fix...",
  "correction_needed": boolean
}
`;
    },

    /**
     * STEP 3: FINALIZE (Polish)
     * Applies formatting, emojis, and structure.
     */
    getFinalizePrompt(draft, critique) {
        return `SYSTEM: You are a Markdown Artist.
Your job is to take the content and make it visually STUNNING.

=== DRAFT CONTENT ===
${draft}

=== CRITIQUE FEEDBACK (Apply these fixes) ===
${critique}

=== VISUAL GUIDELINES ===
- Use Badges (shields.io style text) for stacks.
- Use Emojis for headers.
- Use a clear, centered layout for the header.
- **NO "npm install"**.

OUTPUT: The Final README.md code block.
`;
    }
};
