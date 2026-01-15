// temp_scripts/reality_determinist_test.js
// Test determinista de flujo real adaptado para Node.js

// 1. Mock global window ANTES de cualquier lógica de importación asíncrona
global.window = {
    githubAPI: {
        listRepos: async () => [{ name: 'TestRepo', full_name: 'mauro3422/TestRepo', language: 'JavaScript', stargazers_count: 5 }],
        getProfileReadme: async () => 'Testing Readme',
        getRepoTree: async () => ({ tree: [{ path: 'index.js', type: 'blob', sha: '123' }], sha: 'tree123' }),
        getFileContent: async () => ({
            content: Buffer.from('console.log("Hello AI");').toString('base64'),
            sha: 'file123'
        }),
        checkAuth: async () => ({ login: 'mauro3422' }),
        logToTerminal: (msg) => console.log(`[TERMINAL]: ${msg}`)
    },
    utilsAPI: {
        checkAIHealth: async () => true
    },
    AI_CONFIG: {
        endpoint: 'http://localhost:8000/v1/chat/completions'
    },
    AI_OFFLINE: false
};

// Polifill simple para document si es necesario
global.document = {
    querySelector: () => null
};

async function runDeterministTest() {
    console.log('🚀 INICIANDO TEST DETERMINISTA DE FLUJO REAL...');
    console.time('Total Time');

    try {
        // Cargar módulos dinámicamente ahora que window está listo
        const { AIService } = await import('../src/renderer/js/services/aiService.js');
        const { ProfileAnalyzer } = await import('../src/renderer/js/services/profileAnalyzer.js');
        const { CacheRepository } = await import('../src/renderer/js/utils/cacheRepository.js');
        const { Logger } = await import('../src/renderer/js/utils/logger.js');

        await CacheRepository.clear();
        const analyzer = new ProfileAnalyzer();

        console.log('--- FASE 1: Análisis Agéntico ---');
        const results = await analyzer.analyze('mauro3422', (step) => {
            if (step.type === 'Progreso') {
                console.log(`[PROGRESS] ${step.percent}% - ${step.message}`);
            }
        });

        console.log('--- FASE 2: Esperando Workers (Métricas en tiempo real) ---');
        if (analyzer.fullIntelligencePromise) {
            await analyzer.fullIntelligencePromise;
        }

        console.log('--- FASE 3: Verificación de Truncamiento y Sustancia ---');
        console.log('SUMMARY:', results?.summary || 'No summary generated');

        const stats = analyzer.workerPool.getStats();
        console.log('--- MÉTRICAS FINALES ---');
        console.log(`Archivos procesados: ${stats.processed}/${stats.queued}`);
        console.log(`Fallos: ${stats.failed}`);

        console.timeEnd('Total Time');
        process.exit(0);
    } catch (e) {
        console.error('❌ TEST FALLIDO:', e);
        process.exit(1);
    }
}

runDeterministTest();
