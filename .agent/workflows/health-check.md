---
description: Comprehensive code health check - analyzes entire codebase for bugs, architecture issues, and optimization opportunities
---

# /health-check Workflow

## Purpose
Perform a deep system health analysis using the global `code-health-expert` skill. This workflow generates a formal report on the state of the project.

## When to Use
- Invoke with `/health-check` command
- After major architectural changes
- Before a project release

## Steps

// turbo-all

### 1. Initialize Audit Intelligence
Activate the `code-health-expert` skill. Review the project's [DNA](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/src/renderer/js/services/cacheRepository.js) and architecture.

### 2. Scan Project Structure
```powershell
# Understand the current layout
Get-ChildItem -Path "src" -Recurse -Directory
```

### 3. Deep Analysis (via Code-Health Skill)
Using the `code-health-expert` mindset, scan the following areas:
- **Entry Points**: `src/main/index.js`, `src/preload/index.js`, `src/renderer/index.js`.
- **Data Persistence**: `src/main/services/cacheService.js`.
- **AI Integration**: `src/renderer/js/services/aiService.js`.

### 4. Generate Professional Report
Create a markdown report in `brain/health_check_report.md` (or update `implementation_plan.md`) including:
- **Architecture Overview**: Use Mermaid for diagrams.
- **Auditor's Findings**: Group issues by severity (CRITICAL/MEDIUM/LOW) using the skill's checklist.
- **Refactoring Proposals**: Actionable code changes.
- **Verification Plan**: How to test the proposed fixes.

## Proactive Alerts
While running this workflow, IMMEDIATELY notify the user via `notify_user` if you find:
- ⚠️ Security vulnerabilities or exposed secrets.
- ⚠️ Race conditions in the IPC layer.
- ⚠️ Major SOLID violations that block scalability.
