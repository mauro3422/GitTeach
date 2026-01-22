---
description: Create test scripts that simulate and replicate bug scenarios with state capture
---

# /replicate-bug - Bug Replicator Workflow

Create automated scripts that simulate user interactions to replicate bugs.

## Steps

1. [SYSTEM] Activate the bug-replicator protocol
// turbo
2. View the `~/.gemini/antigravity/skills/bug-replicator/SKILL.md` file to load the S.I.C.A.D. methodology.

3. **SCENARIO**: Define the bug to replicate.
   - What user action triggers it?
   - What components are involved?

4. **INSTRUMENT**: Add diagnostic probes to capture state.
   - Console.logs with timestamps and state snapshots
   - Before/after comparisons

5. **CREATE**: Generate a test script in `report/bug_<name>_test.js`.
   - **NO MOCKS**: Use real system components/classes via imports.
   - Simulate user interaction
   - Verify bug symptoms

6. **ANALYZE**: Run the script and capture output.
   - Save to `report/bug_<name>_output.log`

7. **DIAGNOSE**: Use captured data to find root cause.
   - Document findings in `report/bug_<name>_diagnosis.md`
