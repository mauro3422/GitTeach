# Aggregator Modules Consolidation Plan

## Overview
This document outlines the plan to consolidate 8 separate aggregator modules in the curator directory into a single, configurable `ConfigurableAggregator` class. This consolidation will reduce code duplication, improve maintainability, and simplify the architecture.

## Current State Analysis

### Aggregator Modules Identified
1. `IMetricAggregator.js` - Interface contract for metric aggregators
2. `MetricAggregatorOrchestrator.js` - Coordinates all metric aggregators
3. `MetricRefinery.js` - Thin orchestrator for metric aggregation
4. `KnowledgeAggregator.js` - Knowledge-related metrics (clarity, discipline, depth)
5. `LogicAggregator.js` - Logic-related metrics (SOLID, modularity, complexity)
6. `ProfessionalAggregator.js` - Professional development metrics
7. `ResilienceAggregator.js` - Resilience and forensics metrics
8. `SemanticAggregator.js` - Semantic and contextual metrics

### Common Interface Pattern
All concrete aggregator implementations extend `IMetricAggregator` and implement:
- `aggregate(nodes, totalFiles)` - Main aggregation method
- `getDomain()` - Returns domain identifier
- `validate(nodes)` - Validates input data
- `getDefaultStructure()` - Returns default output structure

### Key Observations
- All aggregators follow the same interface contract
- Each aggregator specializes in processing specific metadata fields
- Significant code duplication exists in the aggregation patterns
- The orchestrator currently instantiates and manages all individual aggregators

## Proposed Solution: ConfigurableAggregator

### Design Concept
Create a single `ConfigurableAggregator` class that accepts configuration objects to define its behavior for different domains. This approach will:

- Reduce code duplication
- Simplify maintenance
- Allow for easier addition of new aggregation domains
- Maintain the same external interface

### Interface Definition
```javascript
export class ConfigurableAggregator {
  constructor(config) {
    this.config = config;
  }
  
  aggregate(nodes, totalFiles = 0) {
    // Generic aggregation logic using this.config
  }
  
  getDomain() {
    return this.config.domain;
  }
  
  validate(nodes) {
    // Generic validation logic using this.config
  }
  
  getDefaultStructure() {
    return this.config.defaultStructure;
  }
}
```

### Configuration Schema
Each aggregator domain will be configured with an object containing:
- `domain`: String identifier for the domain
- `fieldMappings`: Object mapping input fields to processing functions
- `aggregationLogic`: Function that performs the specific aggregation
- `validationLogic`: Function that validates domain-specific requirements
- `defaultStructure`: Object defining the default output structure

## Implementation Plan

### Phase 1: Create ConfigurableAggregator Class
- Implement the base `ConfigurableAggregator` class
- Define the configuration schema
- Implement generic aggregation, validation, and structure methods

### Phase 2: Define Domain Configurations
Create configuration objects for each existing domain:

#### Knowledge Domain Configuration
```javascript
const knowledgeConfig = {
  domain: 'knowledge',
  fieldMappings: {
    clarity: 'metadata.knowledge.clarity',
    discipline: 'metadata.knowledge.discipline', 
    depth: 'metadata.knowledge.depth'
  },
  aggregationLogic: (nodes) => {
    // Logic to calculate averages for knowledge metrics
  },
  validationLogic: (nodes) => {
    // Check if any nodes have knowledge data
  },
  defaultStructure: {
    clarity: "0.00",
    discipline: "0.00", 
    depth: "0.00",
    analyzedFiles: 0
  }
};
```

#### Logic Domain Configuration
```javascript
const logicConfig = {
  domain: 'logic',
  fieldMappings: {
    solid: 'metadata.solid',
    modularity: 'metadata.modularity',
    complexity: ['params.complexity', 'metadata.complexity', 'metadata.signals.complexity']
  },
  aggregationLogic: (nodes) => {
    // Logic to calculate averages for logic metrics
    // Filter out documentation nodes
  },
  validationLogic: (nodes) => {
    // Check if we have at least some code-related nodes
  },
  defaultStructure: {
    solid: "0.00",
    modularity: "0.00",
    complexity: "0.00", 
    analyzedFiles: 0
  }
};
```

#### Professional Domain Configuration
```javascript
const professionalConfig = {
  domain: 'professional',
  fieldMappings: {
    quality: 'metadata.professional.code_quality',
    ecosystem: 'metadata.professional.ecosystem',
    collaboration: 'metadata.professional.collaboration',
    growth: 'metadata.professional.growth',
    churn: 'file_meta'
  },
  aggregationLogic: (nodes) => {
    // Complex aggregation involving multiple maps and calculations
  },
  validationLogic: (nodes) => {
    // Check if any nodes have professional data
  },
  defaultStructure: {
    quality: { cyclomatic: "0.00", debt_ratio: "0.00", maintainability: "0.00" },
    ecosystem: { top_tools: [], dominant_strategy: "Unknown" },
    collaboration: { review_participation: "0.00", mentoring_culture: "Neutral" },
    growth: { dominant_vibe: "Unknown", skill_signals: [] },
    churn: { avg_age_days: "Unknown", unique_authors: 0 }
  }
};
```

#### Resilience Domain Configuration
```javascript
const resilienceConfig = {
  domain: 'resilience',
  fieldMappings: {
    error_discipline: ['metadata.resilience_forensics.error_discipline', 'metadata.signals.auditability'],
    defensive_posture: ['metadata.resilience_forensics.defensive_posture', 'metadata.signals.resilience'],
    optimization_score: ['metadata.resilience_forensics.optimization_score', 'metadata.signals.resources'],
    domain_fidelity: 'metadata.signals.domain_fidelity',
    antipatterns: 'metadata.resilience_forensics.antipatterns'
  },
  aggregationLogic: (nodes) => {
    // Logic to calculate resilience scores and track anti-patterns
  },
  validationLogic: (nodes) => {
    // Check if any nodes have resilience metrics or signals
  },
  defaultStructure: {
    error_discipline_score: "0.00",
    defensive_posture_score: "0.00", 
    optimization_score: "0.00",
    domain_fidelity_score: "0.00",
    common_antipatterns: [],
    analyzed_files: 0
  }
};
```

#### Semantic Domain Configuration
```javascript
const semanticConfig = {
  domain: 'semantic',
  fieldMappings: {
    business_context: 'metadata.semantic.business_context',
    design_tradeoffs: 'metadata.semantic.design_tradeoffs',
    dependencies: 'metadata.semantic.dependencies',
    dimensions: 'metadata.dimensions'
  },
  aggregationLogic: (nodes) => {
    // Logic to aggregate semantic and contextual metrics
  },
  validationLogic: (nodes) => {
    // Check if any nodes have semantic or dimensions data
  },
  defaultStructure: {
    contexts: { top_contexts: [] },
    dependencies: { top_frameworks: [], dominant_maturity: "Unknown" },
    design: { common_tradeoffs: [] },
    dimensions: { social: "0.00", security: "0.00", testability: "0.00" }
  }
};
```

### Phase 3: Update Orchestrator
Modify `MetricAggregatorOrchestrator.js` to use configured instances:
```javascript
// Replace individual aggregator instantiation with:
this.aggregators = {
  logic: new ConfigurableAggregator(logicConfig),
  professional: new ConfigurableAggregator(professionalConfig),
  resilience: new ConfigurableAggregator(resilienceConfig),
  semantic: new ConfigurableAggregator(semanticConfig),
  knowledge: new ConfigurableAggregator(knowledgeConfig)
};
```

### Phase 4: Maintain Backward Compatibility
- Keep existing class names as wrappers/delegates to the new ConfigurableAggregator
- Gradually migrate consumers to use the new approach
- Provide deprecation warnings for old classes

### Phase 5: Cleanup
- Remove individual aggregator classes once all consumers are migrated
- Update tests to reflect new architecture

## Benefits

### Reduced Code Duplication
- Eliminate repetitive boilerplate code across all aggregator implementations
- Centralize common aggregation patterns

### Improved Maintainability
- Single point of change for aggregation logic improvements
- Easier to add new aggregation domains
- Consistent error handling and logging

### Enhanced Flexibility
- Easy configuration of new aggregation domains
- Dynamic adjustment of aggregation behavior
- Parameterized aggregation rules

## Risks and Mitigation

### Risk: Breaking Changes
- **Mitigation**: Maintain backward compatibility with wrapper classes during transition

### Risk: Performance Impact
- **Mitigation**: Profile the new implementation to ensure no degradation

### Risk: Increased Complexity
- **Mitigation**: Carefully design configuration schema to remain intuitive

## Testing Strategy

### Unit Tests
- Test each domain configuration independently
- Verify aggregation logic produces identical results to current implementation
- Test edge cases and error conditions

### Integration Tests
- Verify orchestrator works with new ConfigurableAggregator instances
- Ensure output format remains consistent
- Test backward compatibility layers

## Timeline
- Phase 1: 2 days
- Phase 2: 3 days
- Phase 3: 2 days
- Phase 4: 2 days (ongoing during other phases)
- Phase 5: 1 day

**Total estimated time: 8-10 days**

## Success Metrics
- Reduction in total lines of code by at least 30%
- All existing tests continue to pass
- No performance degradation in aggregation operations
- Successful consolidation of 8 modules into 1 configurable module