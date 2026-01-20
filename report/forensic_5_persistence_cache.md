# Forensic Audit Report: Persistence and Cache Phase

## Executive Summary

This report presents a forensic analysis of the GitTeach persistence and cache system. The architecture implements a dual-layer persistence strategy combining LevelDB for high-performance structured storage with JSON files for human-readable debugging and monitoring.

## Architecture Overview

### System Components

1. **Renderer Process**:
   - `CacheRepository`: Central facade coordinating cache operations
   - Specialized managers: `RepoCacheManager`, `FileCacheManager`, `IdentityCacheManager`
   - `LayeredPersistenceManager`: Domain-specific layering for metadata

2. **IPC Bridge** (preload/index.js):
   - Secure exposure of cacheAPI to renderer
   - Translation of JavaScript calls to Electron IPC invocations

3. **Main Process**:
   - `cacheHandler.js`: IPC request routing
   - `CacheService.js`: Orchestration layer
   - `LevelDBManager.js`: Low-level LevelDB operations
   - `SessionManagerService.js`: Session lifecycle management
   - `DiskMirrorService.js`: Human-readable file creation

### Data Flow Architecture

```
Renderer Components → IPC Bridge → Main Process → LevelDB + JSON Mirrors
```

## Detailed Analysis

### 1. What is Persisted and When

#### LevelDB Data (Structured Storage)

**File Cache (Global DB)**:
- Raw file contents and summaries with metadata (SHA, timestamps)
- Repository tree SHAs for change detection
- **When**: File content is fetched and processed during repository analysis

**Session-Specific Data (Session DB)**:
- Raw findings for each repository (key: `raw:finding:{repoName}:{timestamp}:{random}`)
- Curated memory nodes with indexes (key: `mem:node:{uid}`, index: `idx:repo:{repoName}:nodes`)
- Repository blueprints (key: `meta:blueprint:{repoName}`)
- Technical identity, findings, and cognitive profiles per user
- Worker audit logs (key: `log:worker:{id}:{timestamp}:{random}`)
- Repository partitions and golden knowledge
- **When**: During analysis pipeline, when workers complete tasks, when sessions are active

#### JSON Files (Human-Readable Mirrors)

- **raw_findings.jsonl**: Appended with individual findings as they're generated (JSONL format)
- **curated_memory.json**: Overwritten with curated memory nodes when consolidation occurs
- **blueprint.json**: Overwritten with repository blueprint when synthesized
- **SUMMARY.json**: Generated at the end of analysis runs with run statistics
- **context_user.json**: Contains user context data (if exists)
- **technical_identity.json**: Contains technical identity data (if exists)
- **When**: Mirrored in real-time from LevelDB data, with session-specific paths

### 2. LevelDB vs JSON File Split Rationale

The architecture implements a dual persistence strategy:

**LevelDB (Primary Storage)**:
- Purpose: High-performance, structured storage for application logic
- Benefits: Fast key-value lookups, atomic operations, efficient for frequent reads/writes
- Use cases: File caching, session-scoped analysis results, technical identity, worker audits
- Structure: Organized keys with prefixes for different data types (`raw:`, `mem:`, `meta:`, `log:`)

**JSON Files (Mirror/Debug Storage)**:
- Purpose: Human-readable snapshots for debugging, monitoring, and external processing
- Benefits: Easy inspection, compatibility with external tools, transparent format
- Use cases: Development, debugging, audit trails, external analysis
- Structure: Organized by repository and session, with both individual files and JSONL for streaming

The split allows for optimal performance during runtime while maintaining observability and debuggability.

### 3. Write Flow Trace: Who Calls Persist and When

#### Renderer Process Components:
- **CacheRepository**: Central facade that delegates to specialized managers
- **RepoCacheManager**: Calls `window.cacheAPI.persistRepoBlueprint`, `appendRepoRawFinding`, `persistRepoCuratedMemory`
- **FileCacheManager**: Calls `window.cacheAPI.setFileSummary`, `setRepoTreeSha`
- **IdentityCacheManager**: Calls `window.cacheAPI.setTechnicalIdentity`, `setTechnicalFindings`, `setCognitiveProfile`
- **LayeredPersistenceManager**: Calls `window.cacheAPI.setTechnicalIdentity` for layered metadata
- **RepoContextManager**: Calls `window.cacheAPI.persistRepoGoldenKnowledge`
- **ThematicMapper**: Calls `window.cacheAPI.persistPartitionDebug`

#### IPC Bridge (preload/index.js):
- Exposes `cacheAPI` methods to renderer
- Translates renderer calls to IPC invocations
- Methods like `persistRepoBlueprint`, `appendRepoRawFinding`, etc. become IPC calls

#### Main Process Handlers (src/main/handlers/cacheHandler.js):
- Receives IPC calls and routes to CacheService
- Wraps calls with IpcWrapper for error handling

#### CacheService (src/main/services/CacheService.js):
- Acts as orchestration layer
- Routes to appropriate managers based on data type
- Global DB for file cache, Session DB for analysis results
- Calls DiskMirrorService to create JSON mirrors

#### Timing of Persist Operations:
- **File caching**: When files are analyzed and processed
- **Raw findings**: As workers discover new findings
- **Curated memory**: When curation pipeline consolidates knowledge
- **Blueprints**: When repository analysis is complete
- **Identity/profiles**: When user analysis is updated
- **Worker audits**: When workers complete tasks
- **Session switching**: When switching between analysis sessions

### 4. Persistence-Related Events

#### Cache Operations:
- `cache:needs-update` - Check if file needs update based on SHA
- `cache:set-file-summary` - Store file summary and content
- `cache:get-file-summary` - Retrieve file summary
- `cache:has-repo-changed` - Check if repo tree changed
- `cache:set-repo-tree-sha` - Store repo tree SHA
- `cache:get-stats` - Get cache statistics
- `cache:clear` - Clear cache (not fully implemented)

#### Identity/Intelligence Operations:
- `cache:get-technical-identity` - Retrieve technical identity
- `cache:set-technical-identity` - Store technical identity
- `cache:get-technical-findings` - Retrieve technical findings
- `cache:set-technical-findings` - Store technical findings
- `cache:get-cognitive-profile` - Retrieve cognitive profile
- `cache:set-cognitive-profile` - Store cognitive profile

#### Analysis Results Operations:
- `cache:append-repo-raw-finding` - Add raw finding to repo
- `cache:persist-repo-curated-memory` - Store curated memory nodes
- `cache:persist-repo-blueprint` - Store repository blueprint
- `cache:get-all-repo-blueprints` - Retrieve all blueprints
- `cache:persist-repo-partitions` - Store semantic partitions
- `cache:persist-repo-golden-knowledge` - Store golden knowledge
- `cache:get-repo-golden-knowledge` - Retrieve golden knowledge

#### Worker Operations:
- `cache:append-worker-log` - Add worker audit entry
- `cache:get-worker-audit` - Retrieve worker audit logs

#### Session Operations:
- `cache:switch-session` - Switch active session
- `cache:generate-summary` - Generate run summary

### 5. Identified Blind Spots

#### Race Conditions:
- **Concurrent Session Access**: Multiple renderer processes could theoretically try to switch sessions simultaneously, causing conflicts in SessionManagerService
- **Parallel File Operations**: Multiple workers might try to write to the same raw_findings.jsonl file simultaneously, potentially causing interleaved writes
- **Cache Invalidation**: No explicit coordination between file updates and cache invalidation could lead to stale data

#### Corrupted Writes:
- **JSONL Append Operations**: The `fs.appendFileSync` in DiskMirrorService could result in malformed JSON if interrupted mid-write
- **LevelDB Transactions**: No explicit transaction handling means partial writes could leave inconsistent state
- **Mirror Failures**: If LevelDB write succeeds but JSON mirror fails, data becomes inconsistent between systems

#### Orphan Files:
- **Session Cleanup**: No explicit cleanup mechanism for session databases when sessions are closed
- **Incomplete Sessions**: If a session is interrupted, the corresponding LevelDB and JSON files remain as orphans
- **File Cache Growth**: No explicit cache eviction policy could lead to unbounded growth

### 6. Proposed Metrics to Track

#### System-Level Metrics:
```javascript
persistence: {
  writeCount: 0,           // Total write operations
  lastWriteTime: timestamp,// Timestamp of last write
  diskUsage: bytes,        // Total disk space used
  errorCount: 0,          // Count of failed operations
  levelDbSize: bytes,     // Size of LevelDB files
  jsonMirrorSize: bytes,  // Size of JSON mirror files
  sessionCount: 0         // Number of active sessions
}
```

#### Per-Repository Metrics:
```javascript
[repoName]: {
  findingsCount: 0,       // Number of raw findings
  lastUpdated: timestamp, // Last update timestamp
  status: 'active'|'complete'|'error', // Processing status
  fileSize: bytes,        // Size of repo's data
  fileCount: 0,          // Number of files processed
  errorCount: 0          // Errors during processing
}
```

#### Session-Specific Metrics:
```javascript
session: {
  id: sessionId,
  startTime: timestamp,
  duration: ms,
  reposProcessed: 0,
  totalFindings: 0,
  diskUsage: bytes,
  status: 'active'|'completed'|'interrupted'
}
```

### 7. Write Sequence Diagram

```mermaid
sequenceDiagram
    participant R as Renderer Process
    participant IPC as IPC Bridge
    participant M as Main Process
    participant CS as Cache Service
    participant LD as LevelDB Manager
    participant DM as Disk Mirror Service
    
    R->>IPC: cacheAPI.persistRepoBlueprint(repoName, blueprint)
    IPC->>M: ipcRenderer.invoke('cache:persist-repo-blueprint')
    M->>CS: cacheService.persistRepoBlueprint(repoName, blueprint)
    CS->>LD: sessionDb.put(`meta:blueprint:${repoName}`, blueprint)
    CS->>DM: diskMirrorService.mirrorRepoBlueprint(repoName, blueprint)
    DM->>Note: Write to JSON file
    LD-->>CS: Acknowledgment
    CS-->>M: Success response
    M-->>IPC: Return result
    IPC-->>R: Promise resolves
```

## Recommendations

1. **Add Transaction Support**: Implement transaction handling for critical operations to prevent partial writes
2. **Session Cleanup**: Implement automatic cleanup for session databases to prevent orphan files
3. **Concurrency Control**: Add locking mechanisms for concurrent file operations, especially JSONL appends
4. **Monitoring Integration**: Implement the proposed metrics tracking to monitor system health
5. **Consistency Validation**: Add periodic checks to validate consistency between LevelDB and JSON mirrors
6. **Cache Eviction Policy**: Implement LRU or TTL-based cache eviction to prevent unbounded growth
7. **Error Recovery**: Add retry mechanisms and error recovery for failed operations

## Conclusion

The GitTeach persistence system demonstrates a well-thought-out architecture that balances performance with observability. The dual-layer approach of LevelDB for speed and JSON for transparency is sound, though it introduces complexity that requires careful attention to race conditions and consistency. The identified blind spots should be addressed to improve system reliability and maintainability.