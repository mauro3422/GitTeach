# Data Flow: Curator & Synthesis Lifecycle Report

## Overview
This document analyzes the complete lifecycle from raw findings to technical identity, focusing on how findings become blueprints, then identity in the Giteach system.

## 1. Input: Raw Findings Structure

Raw findings are collected from various sources during the scanning process:

```javascript
{
  repo: "repository-name",
  file: "path/to/file",
  path: "path/to/file", 
  summary: "brief summary of the file",
  uid: "unique identifier",
  workerId: "worker identifier",
  classification: "technical strength category",
  file_meta: { /* file metadata */ },
  metadata: { /* additional metadata */ },
  params: {
    insight: "detailed insight about the code",
    technical_strength: "strength level",
    evidence: "supporting evidence",
    tags: ["array", "of", "relevant", "tags"]
  },
  timestamp: "ISO timestamp"
}
```

## 2. Curation Stages

### 2.1 Partition Stage
The `InsightPartitioner` divides insights into three semantic layers:
- **Architecture**: Pattern & Structure signals (classes, modules, system design)
- **Habits**: Resilience & Style signals (error handling, testing, code quality)
- **Stack**: Tools & Dependencies signals (frameworks, libraries, tech stack)

### 2.2 Aggregate Stage
The `InsightsCurator` performs "The Funnel of Truth":
- **Filtering**: Removes anomalies and integrity issues
- **Deduplication**: Uses Jaccard similarity (threshold 0.65) to detect echoes
- **Weighting**: Increases weight for confirmed insights
- **Rarity Filtering**: Allows Tier-S concepts (ast, compiler, memory, mutex, etc.) even if duplicated

### 2.3 Synthesize Stage
The `SynthesisOrchestrator` coordinates the synthesis pipeline:
- **Thematic Mapping**: Parallel execution of Architecture, Habits, and Stack mappers
- **DNA Synthesis**: Combines thematic analyses into technical DNA
- **Identity Formation**: Creates the final technical identity

## 3. Output: Technical Identity Structure

The final technical identity follows this structure:

```javascript
{
  thought: "Internal reasoning about the developer's architecture and patterns",
  bio: "2-3 sentences describing the developer's technical profile",
  traits: [
    {
      name: "trait name",
      score: integer score (0-100),
      details: "explanation of the trait",
      evidence: "supporting evidence",
      evidence_uids: ["array", "of", "memory", "node", "uids"]
    }
  ],
  distinctions: [
    {
      signal: "the signal detected",
      badge: "badge name",
      justification: "why this badge was awarded"
    }
  ],
  signature_files: ["array", "of", "signature", "files"],
  code_health: {
    logic_integrity: integer (0-100),
    knowledge_integrity: integer (0-100),
    details: "explanation of code health"
  },
  verdict: "developer classification",
  tech_radar: {
    adopt: ["technologies", "to", "adopt"],
    trial: ["technologies", "to", "trial"],
    assess: ["technologies", "to", "assess"],
    hold: ["technologies", "to", "hold"]
  },
  extended_metadata: {
    social_score: number,
    security_score: number,
    testability_score: number,
    dominant_stack_maturity: string
  },
  professional_context: {
    quality_index: string,
    ecosystem_profile: string,
    collaboration_style: string,
    seniority_vibe: string,
    code_churn: string
  },
  resilience_context: {
    error_discipline: string,
    defensive_posture: string,
    optimization: string,
    top_antipatterns: ["array", "of", "antipatterns"]
  },
  anomalies: [
    {
      trait: "trait name",
      impact: "impact level",
      evidence: "supporting evidence"
    }
  ],
  presentation: {
    logic_radar: [{ label: string, score: integer }],
    knowledge_radar: [{ label: string, score: integer }],
    seniority_badges: [
      {
        name: string,
        description: string,
        signal: string
      }
    ]
  }
}
```

## 4. Memory Management (Cache, Persistence)

### 4.1 Layered Persistence
The `LayeredPersistenceManager` handles granular metadata storage:
- **Repository Blueprints**: Individual repository analysis stored separately
- **Thematic Layers**: Architecture, Habits, Stack layers stored individually
- **Identity Broker**: Master object linking all layers together
- **Traceability Maps**: Links concepts to source files

### 4.2 Cache Operations
The `CacheRepository` provides a unified interface:
- **File Cache**: Stores file summaries and content snippets
- **Repo Cache**: Manages repository blueprints and change detection
- **Identity Cache**: Handles technical identity and cognitive profiles

### 4.3 Streaming Updates
The `StreamingHandler` manages real-time processing:
- Accumulates findings as they arrive
- Generates blueprints immediately after repository scanning
- Updates global identity when critical mass is reached
- Maintains evolution state and metrics

## 5. Optimization Recommendations

### 5.1 Performance Optimizations
1. **Semantic Partitioning**: Divide insights by relevance to ensure each mapper gets 100% of its relevant context
2. **Parallel Processing**: Execute thematic mapping in parallel for architecture, habits, and stack
3. **Gatekeeper Implementation**: Only refine global identity when critical mass is reached (≥1 rich repo or ≥2 decent repos)
4. **Golden Knowledge**: Use cached golden knowledge for thematic mapping when available

### 5.2 Memory Optimizations
1. **Density Cap**: Sort by weight and slice top 150 insights for AI consumption
2. **Reference Limiting**: Limit traceability references per strength to avoid massive JSON
3. **Evidence UID Management**: Limit to top 5 high-fidelity evidence links per trait

### 5.3 Data Transformation Examples
**Before Curation**: 1000+ raw findings with duplicates and noise
**After Partitioning**: ~300 findings divided into architecture, habits, stack categories
**After Aggregation**: ~150 unique insights with weights applied
**After Synthesis**: Technical DNA with 10-15 key traits and comprehensive profile

### 5.4 Bottleneck Analysis
1. **AI Call Latency**: DNA synthesis depends on AI service response time
2. **Memory Node Linking**: Evidence UID linking can be computationally intensive
3. **Large Repository Sets**: Processing many repositories simultaneously may strain resources
4. **Traceability Map Growth**: Large traceability maps can impact performance

### 5.5 Scalability Improvements
1. **Batch Processing**: Process findings in batches rather than individually
2. **Caching Strategies**: Cache intermediate results to avoid recomputation
3. **Asynchronous Operations**: Use non-blocking operations where possible
4. **Resource Management**: Implement proper resource cleanup and memory management