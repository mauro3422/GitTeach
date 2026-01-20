# Forensic Audit Report: Curator and Streaming Phase

## Executive Summary

This report analyzes the "Curator and Streaming" phase of GitTeach, focusing on the Evidence Mixer, Gatekeeper logic, and convergence of Rich Findings and Skeleton findings. The analysis reveals a sophisticated system with adaptive compaction, critical mass detection, and event-driven architecture.

## 1. Evidence Mixer Architecture

### 1.1 Convergence of Rich Findings + Skeletons

The Evidence Mixer operates as a central hub where two streams of data converge:

- **Rich Findings**: Detailed analysis results from AI workers containing insights, classifications, and metadata
- **Skeleton Findings**: Lightweight metadata from files that bypass intensive AI processing

The convergence occurs through the `EvidenceStore` class which accumulates findings from both sources:

```javascript
// EvidenceStore.accumulateFindings() handles both types of findings
// Normalizes and stores findings consistently regardless of source
```

### 1.2 Mixing Buffer State

The mixing buffer maintains these key metrics:
- `richCount`: Number of rich findings from AI workers
- `skeletonCount`: Number of skeleton findings from auditor
- `totalEvidence`: Combined count of all evidence
- `gateStatus`: Current lock/unlock state of the critical mass gate
- `threshold`: Current threshold for unlocking synthesis

## 2. Compaction Mechanism

### 2.1 Trigger Conditions
- **Frequency**: Every 10 files accumulated in the recent findings buffer
- **Condition**: When `recentFindings.length >= 10` AND no compaction is in progress
- **Location**: Managed by `RepoContextManager.runCompaction()`

### 2.2 Input/Output
- **Input**: 10 recent findings from a single repository
- **Processing**: Runs on CPU server to avoid blocking GPU workers
- **Output**: 
  - Golden Knowledge synthesis (condensed understanding)
  - Coherence score (1-10)
  - Health indicators and metrics
  - Dominant patterns and tech stack signals

### 2.3 Compaction Frequency
- Adaptive: Triggered every 10 files per repository
- Asynchronous: Non-blocking execution to maintain worker throughput
- Retry mechanism: Up to 2 retries with 5-second delays between attempts

## 3. Gatekeeper State Machine

### 3.1 Threshold Calculation
The critical mass gate uses a dual-threshold system:

```javascript
const decentRepos = allBlueprints.filter(bp => bp.volume && bp.volume.analyzedFiles > 2).length;
const richRepos = allBlueprints.filter(bp => bp.volume && bp.volume.analyzedFiles >= 5).length;
const criticalMassReached = richRepos >= 1 || decentRepos >= 2;
```

### 3.2 Gate States
- **LOCKED STATE**: 
  - Trigger: `criticalMassReached` is false
  - Action: Skip global identity refinement
  - Event: `mixer:gate:locked`
  
- **UNLOCKED STATE**:
  - Trigger: `criticalMassReached` is true AND identity updater available
  - Action: Proceed with global identity refinement
  - Event: `mixer:gate:unlocked`

### 3.3 State Transitions
```
[INITIAL] --> [CHECK THRESHOLD] --> LOCKED (if insufficient repos/files)
                                    |
                                    --> UNLOCKED (if sufficient repos/files)
```

## 4. Events Emitted During Phase

### 4.1 File-Level Events
- `file:classified` - When auditor classifies a file
- `file:analyzed` - When a file is analyzed and sent to mixing buffer
- `file:skeletonized` - When a file is processed as a skeleton

### 4.2 Streaming Events
- `streaming:active` - When streaming processing begins/ends for a repo
- `streaming:error` - When streaming encounters an error

### 4.3 Gatekeeper Events
- `mixer:gate:locked` - When critical mass threshold is not met
- `mixer:gate:unlocked` - When critical mass threshold is met

### 4.4 Persistence Events
- `persist:blueprint` - When a repo blueprint is persisted

## 5. Blind Spots & Risk Areas

### 5.1 Memory Leaks
- **Risk**: Accumulation in `EvidenceStore.accumulatedFindings` without cleanup
- **Mitigation**: No automatic cleanup mechanism identified
- **Location**: `EvidenceStore.js`

- **Risk**: Embedding buffer in `MemoryManager` not flushed on shutdown
- **Location**: `MemoryManager.js`

### 5.2 Critical Mass Failure Scenarios
- **Scenario**: Repositories never reach required thresholds (2+ or 5+ files)
- **Impact**: Global identity never refined, limiting system effectiveness
- **Fallback**: No identified fallback mechanism if critical mass never achieved

### 5.3 Race Conditions
- **Risk**: Concurrent compaction attempts per repository
- **Mitigation**: `compactionInProgress` flag prevents concurrent runs
- **Location**: `RepoContextManager.js`

## 6. Data Points for Monitoring

### 6.1 Mixing Buffer Metrics
```javascript
mixing_buffer: {
  richCount: number,           // Count of rich findings
  skeletonCount: number,       // Count of skeleton findings
  totalEvidence: number,       // Combined evidence count
  gateStatus: 'locked'|'unlocked', // Current gate state
  threshold: {
    decentRepos: number,       // Repos with >2 files
    richRepos: number,         // Repos with >=5 files
    required: 'richRepos>=1 OR decentRepos>=2' // Unlock condition
  }
}
```

### 6.2 Compaction Metrics
```javascript
compaction: {
  lastRun: ISODateString,      // Timestamp of last compaction
  filesCompacted: number,      // Number of files processed
  compressionRatio: number,    // Ratio of input to output size
  coherenceScore: number,      // Quality metric (1-10)
  successRate: number          // Successful vs failed compactions
}
```

## 7. Recommendations

1. **Add Memory Cleanup**: Implement periodic cleanup of EvidenceStore to prevent unbounded growth
2. **Fallback Mechanism**: Add timeout-based fallback for critical mass gate to prevent indefinite blocking
3. **Monitoring**: Add metrics collection for all identified data points
4. **Error Handling**: Enhance error recovery in compaction process
5. **Resource Limits**: Add configurable limits to prevent resource exhaustion

## Conclusion

The Curator and Streaming phase implements a sophisticated evidence aggregation system with intelligent gating mechanisms. While generally well-architected, attention should be paid to memory management and failure scenarios to ensure system stability under all conditions.