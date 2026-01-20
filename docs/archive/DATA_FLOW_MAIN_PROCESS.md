# GitTeach Main Process Data Flow Analysis

## Overview
This document analyzes the data flow in GitTeach's main process (Electron), focusing on IPC handlers, services, and how data moves between them.

## 1. Entry Points (IPC Handlers)

### Authentication Handler (`authHandler.js`)
- `github:login` → Triggers OAuth login flow
- `github:check-auth` → Checks authentication status
- `github:logout` → Clears authentication token (fire-and-forget)

### Profile Handler (`ProfileHandler.js`)
- `github:get-user` → Retrieves authenticated user data
- `github:get-profile-readme` → Gets profile README content
- `github:update-profile-readme` → Updates profile README

### Repository Handler (`RepoHandler.js`)
- `github:list-repos` → Lists user repositories
- `github:get-repo-readme` → Gets repository README
- `github:get-repo-tree` → Gets repository file tree
- `github:create-profile-repo` → Creates profile repository
- `github:create-workflow` → Creates GitHub Actions workflow
- `github:get-file-content` → Gets file content from repository

### Commit Handler (`CommitHandler.js`)
- `github:get-user-commits` → Gets user's commits in a repository
- `github:get-commit-diff` → Gets commit diff information

### System Handler (`SystemHandler.js`)
- `utils:get-image-base64` → Converts image URL to Base64
- `utils:check-ai-health` → Checks AI server health
- `utils:check-server-fleet` → Checks fleet of AI servers
- `app:log` → Receives logs from renderer (fire-and-forget)
- `dev:export-prompt` → Exports prompt to file (fire-and-forget)

### Cache Handler (`cacheHandler.js`)
- Multiple cache operations for file summaries, technical identities, cognitive profiles, worker audits, and repo-centric persistence

### Debug Handler (`debugHandler.js`)
- `debug:create-session` → Creates debug session
- `debug:append-log` → Appends log to debug session
- `debug:get-sessions-path` → Gets debug sessions path
- `debug:list-sessions` → Lists available debug sessions

### Fleet Handler (`fleetHandler.js`)
- `fleet:get-status` → Gets AI fleet status
- `fleet:refresh` → Refreshes fleet status
- `fleet:set-limits` → Sets fleet limits
- `fleet:verify` → Verifies fleet health
- `fleet:pipeline-activity` → Reports pipeline activity (fire-and-forget)

## 2. Service Dependencies Diagram (Text-based)

```
[Renderer Process]
       |
       | (IPC Calls)
       v
[IPC Handlers] <-----> [IpcWrapper.js]
    |                         |
    |-------------------------|
    |
    v
[Services Layer]
    |
    |-------------------------|
    |                         |
[authService.js]        [profileService.js]
    |                         |
    |                         |
[OAuthFlowManager]      [githubClient.js]
[TokenManager]          [RequestStrategy]
                        [RepoDataAccessor]
    |                         |
    |-------------------------|
              |
              v
        [githubClient.js]
              |
              |
    [RequestStrategy.js]
              |
              |
    [RepoDataAccessor.js]
              |
              |
    [WorkflowGenerator.js]
              |
              |
    [repoService.js]
              |
              |
        [CacheService.js]
              |
              |
    [LevelDBManager.js]
    [FileCacheManager.js]
    [SessionScopedCache.js]
    [DiskMirrorService.js]
              |
              |
    [aiMonitorService.js] <--> [BrowserWindow]
    [aiFleetService.js] <-----> [FleetMonitor.js]
                                [SlotManager.js]
                                [HealthChecker.js]
                                [FleetBroadcaster.js]
              |
              |
        [firewallService.js]
```

## 3. Data Transformation Points

### Authentication Flow
1. `github:login` → `authHandler.js` → `authService.js` → `OAuthFlowManager.js` → External OAuth
2. Token stored in `TokenManager.js` and set in `githubClient.js`
3. Response sent back to renderer

### Profile Operations
1. `github:get-user` → `ProfileHandler.js` → `profileService.js` → `githubClient.js` → GitHub API
2. Response transformed and sent back to renderer

### Repository Operations
1. `github:list-repos` → `RepoHandler.js` → `repoService.js` → `RepoDataAccessor.js` → `githubClient.js` → GitHub API
2. Data transformed and sent back to renderer

### Cache Operations
1. Various cache operations → `cacheHandler.js` → `cacheService.js` → `LevelDBManager.js` or `SessionScopedCache.js`
2. Data persisted and response sent back to renderer

### AI Health Monitoring
1. Periodic health checks → `aiMonitorService.js` → HTTP request to localhost:8000
2. Status changes broadcast to all BrowserWindows via `ai:status-change` event

## 4. Lifecycle Events

### App Ready Event
```javascript
app.whenReady().then(() => {
    // 1. Initialize network interceptor (Firewall)
    firewallService.init();

    // 2. Register all IPC handlers
    registerAllHandlers();

    // 3. Start AI health monitor
    aiMonitorService.startMonitor();

    // 4. Start AI Fleet Monitoring
    aiFleetService.start();

    // 5. Create the main window
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});
```

### Window Closed Event
```javascript
app.on('window-all-closed', () => {
    aiMonitorService.stopMonitor();
    aiFleetService.stop();
    if (process.platform !== 'darwin') app.quit();
});
```

## 5. Bottlenecks or Inefficiencies Identified

### Potential Issues:
1. **Missing Import in aiMonitorService.js**: The service references `AppLogger` but doesn't import it, which could cause runtime errors.

2. **Centralized GitHub Client**: All GitHub API calls go through a single `githubClient.js` instance, which could become a bottleneck under heavy concurrent usage.

3. **Session Management Complexity**: The cache service implements complex session management with both global and session-scoped caches, which could lead to complexity in maintaining data consistency.

4. **Fire-and-forget IPC Handlers**: Several handlers like `github:logout`, `app:log`, and `dev:export-prompt` use `.on()` instead of `.handle()`, meaning they don't return values to the renderer. This is appropriate for some cases but could be inconsistent.

5. **Hardcoded Port Configuration**: The AI health check is hardcoded to check port 8000, which might not be flexible for different deployment configurations.

### Architectural Strengths:
1. **Clean Separation of Concerns**: Clear separation between handlers (IPC interface) and services (business logic).

2. **Standardized Error Handling**: The `IpcWrapper.js` provides consistent error handling and logging across all handlers.

3. **Modular Service Architecture**: Services are well-encapsulated and delegate to specialized sub-components.

4. **Comprehensive Caching Strategy**: Multiple levels of caching with both global and session-scoped storage.

5. **Monitoring and Health Checks**: Built-in AI server monitoring with status broadcasting to UI.

## Summary
The GitTeach main process follows a well-structured architecture with clear separation between IPC handlers and business logic services. The data flow is predictable and follows a consistent pattern through the IpcWrapper for standardized error handling. The most significant issue identified is the missing import in aiMonitorService.js, which should be addressed to prevent runtime errors.