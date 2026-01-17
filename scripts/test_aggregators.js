/**
 * Test script for new metric aggregators
 * Verifies that all aggregators work correctly
 */

import { LogicAggregator } from '../src/renderer/js/services/curator/LogicAggregator.js';
import { ProfessionalAggregator } from '../src/renderer/js/services/curator/ProfessionalAggregator.js';
import { ResilienceAggregator } from '../src/renderer/js/services/curator/ResilienceAggregator.js';
import { SemanticAggregator } from '../src/renderer/js/services/curator/SemanticAggregator.js';
import { MetricAggregatorOrchestrator } from '../src/renderer/js/services/curator/MetricAggregatorOrchestrator.js';

// Mock memory nodes for testing
const createMockNodes = () => [
    {
        classification: 'JavaScript',
        metadata: {
            solid: 4,
            modularity: 3,
            logic: { solid: 4, modularity: 3, patterns: ['Observer'] },
            knowledge: { clarity: 4, discipline: 4, depth: 3 },
            signals: { semantic: 4, resilience: 3, resources: 4, auditability: 3, domain_fidelity: 4 },
            semantic: {
                business_context: 'Frontend Component',
                design_tradeoffs: ['Performance vs Readability'],
                dependencies: { frameworks: ['React'], maturity: 'Stable' }
            },
            dimensions: { social: 4, security: 3, testability: 4 },
            professional: {
                code_quality: { cyclomatic: 3, debt_ratio: 0.2, maintainability: 85 },
                ecosystem: { ci_cd: ['GitHub Actions'], strategy: 'Cloud' },
                collaboration: { review_ready: 4, mentoring: 'High' },
                growth: { learning_signals: ['TypeScript'], seniority_vibe: 'Mid' }
            },
            resilience_forensics: {
                error_discipline: 4,
                defensive_posture: 3,
                optimization_score: 4,
                antipatterns: ['Generic Catch']
            }
        },
        file_meta: { last_modified: '2024-01-15T10:00:00Z', author: 'developer1' }
    },
    {
        classification: 'TypeScript',
        metadata: {
            solid: 5,
            modularity: 5,
            logic: { solid: 5, modularity: 5, patterns: ['Strategy', 'Factory'] },
            knowledge: { clarity: 5, discipline: 5, depth: 5 },
            signals: { semantic: 5, resilience: 5, resources: 5, auditability: 5, domain_fidelity: 5 },
            semantic: {
                business_context: 'Backend Service',
                design_tradeoffs: ['Scalability vs Simplicity'],
                dependencies: { frameworks: ['Node.js', 'Express'], maturity: 'Stable' }
            },
            dimensions: { social: 5, security: 5, testability: 5 },
            professional: {
                code_quality: { cyclomatic: 2, debt_ratio: 0.1, maintainability: 95 },
                ecosystem: { ci_cd: ['Jenkins'], strategy: 'Hybrid' },
                collaboration: { review_ready: 5, mentoring: 'High' },
                growth: { learning_signals: ['Microservices'], seniority_vibe: 'Senior' }
            },
            resilience_forensics: {
                error_discipline: 5,
                defensive_posture: 5,
                optimization_score: 5,
                antipatterns: []
            }
        },
        file_meta: { last_modified: '2024-01-10T15:30:00Z', author: 'developer2' }
    }
];

async function testAggregators() {
    console.log('🧪 Testing Metric Aggregators...\n');

    const nodes = createMockNodes();

    // Test individual aggregators
    const aggregators = {
        logic: new LogicAggregator(),
        professional: new ProfessionalAggregator(),
        resilience: new ResilienceAggregator(),
        semantic: new SemanticAggregator()
    };

    console.log('1️⃣ Testing Individual Aggregators:');
    for (const [name, aggregator] of Object.entries(aggregators)) {
        try {
            const result = aggregator.aggregate(nodes, 2);
            console.log(`   ✅ ${name}: ${JSON.stringify(result, null, 2).substring(0, 100)}...`);
        } catch (error) {
            console.log(`   ❌ ${name}: ${error.message}`);
        }
    }

    console.log('\n2️⃣ Testing Orchestrator:');
    try {
        const orchestrator = new MetricAggregatorOrchestrator();
        const report = orchestrator.aggregateAll(nodes, 2);

        console.log('   ✅ Orchestrator Report Generated');
        console.log(`   📊 Logic Health: ${report.logic_health.solid} SOLID, ${report.logic_health.modularity} Modularity`);
        console.log(`   👥 Dimensions: ${report.extended_metadata.dimensions.social} Social, ${report.extended_metadata.dimensions.security} Security`);
        console.log(`   🔧 Top Tools: ${report.extended_metadata.professional.ecosystem.top_tools.join(', ')}`);

    } catch (error) {
        console.log(`   ❌ Orchestrator: ${error.message}`);
    }

    console.log('\n3️⃣ Testing MetricRefinery Integration:');
    try {
        // Dynamic import to avoid ES modules issues
        const { MetricRefinery } = await import('../src/renderer/js/services/curator/MetricRefinery.js');
        const report = MetricRefinery.refine(nodes, 2);

        console.log('   ✅ MetricRefinery Integration Successful');
        console.log(`   📈 Volume Status: ${report.volume.status}`);
        console.log(`   🎯 Coverage: ${report.volume.coverage}`);

    } catch (error) {
        console.log(`   ❌ MetricRefinery: ${error.message}`);
    }

    console.log('\n✨ Aggregator Tests Complete!');
}

// Run tests
testAggregators().catch(console.error);
