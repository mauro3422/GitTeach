---
description: Run the code health auditor to scan for standardization, modularization, and DRY opportunities
---

# /scan - Code Health Audit Workflow

Invoke the scan skill to analyze code quality and find improvement opportunities.

// turbo-all

## Steps

1. [SYSTEM] Activate the scan protocol
2. View the `~/.gemini/antigravity/skills/scan/SKILL.md` file to load the S.C.A.N. protocol.

3. **SCOPE**: Determine the audit target based on user input:
   - If user specifies a path → Use that path
   - If no path → Ask which area to analyze
   - Default focus: Input, Coordinates, Rendering, State

4. **COLLECT**: Run pattern detection queries on the target:
   - `addEventListener` bindings
   - `screenToWorld/worldToScreen` calls
   - Magic color values (`#xxx`, `rgba`)
   - Duplicated math operations
   - State mutation patterns

5. **ANALYZE**: Categorize findings:
   - Centralization Candidates (should be in ONE place)
   - Abstraction Candidates (repeated patterns)
   - Contract Violations (inconsistent APIs)

6. **NOTIFY**: Present a prioritized report with:
   - 🔴 High Priority items
   - 🟡 Medium Priority items
   - 🟢 Low Priority items
   - Include: File names, suggested fix, effort level

7. Ask user which improvements they want to implement.
