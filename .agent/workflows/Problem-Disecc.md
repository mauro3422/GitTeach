---
description: Dissect complex problems using the scientific method to explore root causes and propose solutions
---

# /Problem-Disecc - Problem Dissector Workflow

Invoke the problem-dissector skill to systematically analyze ambiguous problems.

## Steps

1. [SYSTEM] Activate the problem-dissector protocol
// turbo
2. View the `~/.gemini/antigravity/skills/problem-dissector/SKILL.md` file to load the S.O.Q.H.E.C.P. methodology.

3. **OBSERVE**: Gather raw facts about the problem without interpretation.
   - What exactly is happening?
   - What files/components are involved?

4. **QUESTION**: Apply the 5 Whys technique to probe deeper.
   - Generate at least 5 progressive questions about root causes.

5. **HYPOTHESIZE**: Create 2-3 ranked theories with probability estimates.
   - For each: What evidence would prove/disprove it?

6. **EXPERIMENT**: Design minimal, reversible tests for each hypothesis.
   - Console.logs, breakpoints, temporary code changes.

7. **CONCLUDE**: Document findings from experiments.
   - Which hypotheses survived? What new info emerged?

8. **PROPOSE**: Present solution options with trade-offs.
   - Include: effort level, pros, cons for each option.
   - Let the user decide which path to take.
