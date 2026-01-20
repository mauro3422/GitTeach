# HANDOVER TASK: Audit CacheService Responsibilities

## 🎯 OBJECTIVE
Analyze `src/main/services/cacheService.js` and identify clear boundaries for further modularization. The file currently handles file caching, session management, and disk mirroring.

## 📝 CONTRACT (I/O)
- **Input**: `src/main/services/cacheService.js` and its sub-managers (`FileCacheManager.js`, `SessionCacheManager.js`).
- **Output**: A technical proposal (Markdown) listing:
    1. Functions that should be moved to a `SessionOrchestrator`.
    2. Redundant methods that can be delegated to existing managers.
    3. Suggested new file structure for a cleaner `CacheService`.

## 🚀 EXECUTION STEPS
1. [ ] **Analyze**: Read `cacheService.js` and trace method calls.
2. [ ] **Map**: Identify methods that manage session state vs. file content state.
3. [ ] **Propose**: Draft the new service architecture.

## ⚠️ RISKS & MITIGATIONS
- **Risk**: Moving session logic might break `switchSession`.
- **Mitigation**: Ensure the proposed `SessionOrchestrator` maintains a reference to the active `LevelDBManager`.

## ✅ VERIFICATION
The output must provide a clear "Before vs After" mapping of methods.
