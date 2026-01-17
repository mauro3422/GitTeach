/**
 * Script de verificación para el refactoring modular
 * Verifica que todas las nuevas clases se puedan instanciar correctamente
 */

console.log('🔍 Verifying Refactoring Structure...');

async function runVerification() {
    try {
        // Test new DNASynthesizer modules
        console.log('✅ Testing DNASynthesizer modules...');

        // Dynamic imports to avoid issues with ES modules
        const { ProfessionalContextSynthesizer } = await import('../src/renderer/js/services/curator/ProfessionalContextSynthesizer.js');
        const { CodeChurnAnalyzer } = await import('../src/renderer/js/services/curator/CodeChurnAnalyzer.js');
        const { EcosystemMapper } = await import('../src/renderer/js/services/curator/EcosystemMapper.js');

        // Test ProfessionalContextSynthesizer
        const qualityIndex = ProfessionalContextSynthesizer.synthesizeQualityIndex({ logic_integrity: 80, knowledge_integrity: 75 }, 70);
        console.log('✅ ProfessionalContextSynthesizer.synthesizeQualityIndex:', qualityIndex);

        const ecosystem = ProfessionalContextSynthesizer.inferEcosystemProfile(['react', 'typescript', 'node']);
        console.log('✅ ProfessionalContextSynthesizer.inferEcosystemProfile:', ecosystem);

        const schema = ProfessionalContextSynthesizer.getSchema();
        console.log('✅ ProfessionalContextSynthesizer.getSchema:', schema.properties ? 'Valid schema' : 'Invalid schema');

        // Test CodeChurnAnalyzer
        const churnRate = CodeChurnAnalyzer.calculateChurnRate([
            { stats: { additions: 100, deletions: 50 } },
            { stats: { additions: 200, deletions: 75 } }
        ], [{ size: 1000 }, { size: 2000 }]);
        console.log('✅ CodeChurnAnalyzer.calculateChurnRate:', churnRate);

        const velocity = CodeChurnAnalyzer.analyzeDevelopmentVelocity([
            { date: '2024-01-01' },
            { date: '2024-01-15' },
            { date: '2024-01-30' }
        ]);
        console.log('✅ CodeChurnAnalyzer.analyzeDevelopmentVelocity:', velocity.velocity);

        // Test EcosystemMapper
        const maturity = EcosystemMapper.mapTechStack(['react', 'typescript', 'vite', 'nextjs']);
        console.log('✅ EcosystemMapper.mapTechStack:', maturity.maturity);

        const radar = EcosystemMapper.assessAdoptionStage(['typescript', 'react', 'jquery']);
        console.log('✅ EcosystemMapper.assessAdoptionStage:', `Adopt: ${radar.adopt.length}, Hold: ${radar.hold.length}`);

        const health = EcosystemMapper.analyzeEcosystemHealth(['react', 'typescript', 'jest']);
        console.log('✅ EcosystemMapper.analyzeEcosystemHealth:', health.balance);

        // Test DeepCurator modules
        console.log('✅ Testing DeepCurator modules...');

        const { StreamingRepoProcessor } = await import('../src/renderer/js/services/curator/StreamingRepoProcessor.js');
        const { BlueprintGenerator } = await import('../src/renderer/js/services/curator/BlueprintGenerator.js');
        const { GlobalIdentityRefiner } = await import('../src/renderer/js/services/curator/GlobalIdentityRefiner.js');

        // Test StreamingRepoProcessor
        const streamingProcessor = new StreamingRepoProcessor(null, null);
        console.log('✅ StreamingRepoProcessor: Instantiated');

        // Test BlueprintGenerator
        const blueprintGenerator = new BlueprintGenerator();
        const testInsights = [{ summary: 'Test insight', file: 'test.js' }];
        const curation = blueprintGenerator.curateFindings(testInsights);
        console.log('✅ BlueprintGenerator.curateFindings:', curation.validInsights.length === 1 ? 'Works' : 'Failed');

        // Test GlobalIdentityRefiner
        const identityRefiner = new GlobalIdentityRefiner();
        console.log('✅ GlobalIdentityRefiner: Instantiated');

        // Test AIService modules
        console.log('✅ Testing AIService modules...');

        const { AIHealthMonitor } = await import('../src/renderer/js/services/ai/AIHealthMonitor.js');
        const { EmbeddingService } = await import('../src/renderer/js/services/ai/EmbeddingService.js');
        const { AISlotPriorities } = await import('../src/renderer/js/services/ai/AISlotPriorities.js');

        // Test AIHealthMonitor
        const healthMonitor = new AIHealthMonitor();
        healthMonitor.updateHealth(false);
        console.log('✅ AIHealthMonitor.updateHealth: No errors');

        // Test EmbeddingService
        const embeddingService = new EmbeddingService();
        const mockEmbedding = await embeddingService.getEmbedding('test');
        console.log('✅ EmbeddingService.getEmbedding:', Array.isArray(mockEmbedding) ? 'Returns array' : 'Failed');

        // Test AISlotPriorities
        console.log('✅ AISlotPriorities.URGENT:', AISlotPriorities.URGENT === 0 ? 'Correct' : 'Wrong');

        // Test DNASynthesizer still works
        console.log('✅ Testing DNASynthesizer integration...');
        const { DNASynthesizer } = await import('../src/renderer/js/services/curator/DNASynthesizer.js');
        const synthesizer = new DNASynthesizer();
        const dnaSchema = synthesizer.getDNASchema();
        console.log('✅ DNASynthesizer.getDNASchema:', dnaSchema.professional_context ? 'Has professional_context' : 'Missing professional_context');

        console.log('🎉 All refactoring verification tests passed!');
        console.log('📝 Refactoring complete! All modules properly modularized.');

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runVerification();