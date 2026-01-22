---
description: Create a new standardized skill using the skill-generator blueprint
---

# /skill - Skill Creation Workflow

Invoke the skill-generator meta-skill to create new agent capabilities.

## Steps

1. [SYSTEM] Activate the skill-generator protocol
// turbo
2. View the `~/.gemini/antigravity/skills/skill-generator/SKILL.md` file to load the skill creation blueprint.

3. Gather skill requirements from the user:
   - **Skill Name**: Short, kebab-case identifier (e.g., `code-reviewer`, `test-runner`)
   - **Skill Purpose**: One-sentence description of what the skill does
   - **Key Features**: Main capabilities or steps the skill provides

4. Create the skill structure:
   ```
   ~/.gemini/antigravity/skills/<skill-name>/
   ├── SKILL.md          (Required: YAML frontmatter + instructions)
   ├── scripts/          (Optional: automation scripts)
   ├── examples/         (Optional: usage examples)
   └── resources/        (Optional: templates, assets)
   ```

5. Write the `SKILL.md` with:
   - YAML frontmatter: `name`, `description`
   - Clear protocol/steps for the agent to follow
   - Best practices and constraints

6. Validate the skill structure:
   - Ensure YAML frontmatter is valid
   - Verify instructions are actionable
   - Check for any referenced scripts/resources

7. Notify user of the new skill and suggest adding a workflow shortcut if needed.
