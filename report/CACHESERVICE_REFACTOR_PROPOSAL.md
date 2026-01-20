# CacheService Refactoring Proposal

## Current Architecture Overview

The CacheService is a singleton class that manages multiple caching responsibilities:
- Global database for file caching
- Session-specific databases for analysis results
- File cache operations
- Intelligence/identity data storage
- Disk mirroring services
- Worker audit functionality

## Issues with Current Implementation

1. **Single Responsibility Violation**: The class handles too many concerns
2. **Tight Coupling**: Session management and file caching are intertwined
3. **Complexity**: Hard to maintain, test, and extend
4. **Scalability**: Adding new cache types increases complexity exponentially

## Proposed Modular Architecture

### 1. Core Service Abstraction
```
CacheOrchestrator (Master Orchestrator)
├── FileCacheService (handles file caching)
├── SessionManagementService (handles session switching)
├── SessionScopedCacheService (handles session data)
├── DiskMirrorService (existing service)
└── LevelDBManager (database abstraction)
```

### 2. Detailed Component Breakdown

#### FileCacheService
- **Responsibility**: Handle all file-related caching operations
- **Methods**:
  - `needsUpdate(owner, repo, path, sha)`
  - `setFileSummary(owner, repo, path, sha, summary, content, fileMeta)`
  - `getFileSummary(owner, repo, path)`
  - `setRepoTreeSha(owner, repo, sha)`
  - `hasRepoChanged(owner, repo, currentSha)`
- **Database**: Always uses global DB
- **Dependencies**: LevelDBManager (global)

#### SessionManagementService
- **Responsibility**: Manage session lifecycle and switching
- **Methods**:
  - `switchSession(sessionId)`
  - `getCurrentSessionId()`
  - `getSessionDb()`
  - `isActiveSession()`
- **State Management**:
  - Track current session ID
  - Manage session database connections
  - Handle session cleanup
- **Dependencies**: LevelDBManager (session-specific)

#### SessionScopedCacheService
- **Responsibility**: Handle all session-specific caching operations
- **Categories**:
  - Repo Analysis Results
  - Intelligence/Identity Data
  - Worker Audit Data
- **Methods**:
  - `appendRepoRawFinding(repoName, finding)`
  - `persistRepoCuratedMemory(repoName, nodes)`
  - `persistRepoBlueprint(repoName, blueprint)`
  - `getAllRepoBlueprints()`
  - `setTechnicalIdentity(user, identity)`
  - `getTechnicalIdentity(user)`
  - `setTechnicalFindings(user, findings)`
  - `getTechnicalFindings(user)`
  - `setCognitiveProfile(user, profile)`
  - `getCognitiveProfile(user)`
  - `setWorkerAudit(id, finding)`
  - `getWorkerAudit(id)`
  - `persistRepoPartitions(repoName, partitions)`
  - `persistRepoGoldenKnowledge(repoName, data)`
  - `getRepoGoldenKnowledge(repoName)`
- **Dependencies**: SessionManagementService, LevelDBManager (active session)

#### CacheOrchestrator (New Master Orchestrator)
- **Responsibility**: Coordinate between all cache services
- **Maintains references to**:
  - FileCacheService instance
  - SessionManagementService instance
  - SessionScopedCacheService instance
  - DiskMirrorService instance
- **Provides unified interface** matching current CacheService API
- **Handles cross-cutting concerns** like disk mirroring coordination

### 3. Dependency Injection Strategy

```javascript
// Factory pattern for creating services
const createCacheServices = () => ({
  fileCacheService: new FileCacheService(),
  sessionManagementService: new SessionManagementService(),
  sessionScopedCacheService: new SessionScopedCacheService(),
  diskMirrorService: new DiskMirrorService()
});

// CacheOrchestrator coordinates them
class CacheOrchestrator {
  constructor(services = createCacheServices()) {
    this.fileCacheService = services.fileCacheService;
    this.sessionManagementService = services.sessionManagementService;
    this.sessionScopedCacheService = services.sessionScopedCacheService;
    this.diskMirrorService = services.diskMirrorService;
  }
  
  // Delegate methods to appropriate services
  async needsUpdate(owner, repo, path, sha) {
    return await this.fileCacheService.needsUpdate(owner, repo, path, sha);
  }
  
  async switchSession(sessionId) {
    await this.sessionManagementService.switchSession(sessionId);
    // Coordinate with disk mirror service
    const sessionPath = this.sessionManagementService.getSessionPath();
    this.diskMirrorService.setMirrorPath(sessionPath);
  }
  
  // ... other delegation methods
}
```

### 4. Benefits of Refactoring

1. **Single Responsibility**: Each service has one clear purpose
2. **Loose Coupling**: Services can be developed and tested independently
3. **Enhanced Maintainability**: Changes to one concern don't affect others
4. **Improved Testability**: Each service can be unit tested separately
5. **Better Extensibility**: Adding new cache types is easier
6. **Clearer API Boundaries**: Well-defined interfaces between components

### 5. Migration Strategy

1. **Phase 1**: Create new service classes alongside existing CacheService
2. **Phase 2**: Gradually migrate functionality to new services
3. **Phase 3**: Update CacheOrchestrator to delegate to new services
4. **Phase 4**: Verify all functionality remains intact
5. **Phase 5**: Remove old monolithic implementation

### 6. Testing Considerations

- Unit tests for each individual service
- Integration tests for service coordination
- End-to-end tests to ensure API compatibility
- Performance tests to validate no regression

### 7. Backward Compatibility

The CacheOrchestrator will maintain the same public API as the current CacheService to ensure backward compatibility with existing code.