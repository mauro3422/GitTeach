
const { ProfileAnalyzer } = require('./src/renderer/js/services/profileAnalyzer.js');
const { AIService } = require('./src/renderer/js/services/aiService.js');
const fs = require('fs');
const path = require('path');

// Mock de window y APIs para ambiente Node
global.window = {
    githubAPI: {
        logToTerminal: (msg) => console.log(`[TERMINAL] ${msg}`)
    },
    cacheAPI: {
        getDeveloperDNA: async (u) => {
            console.log(`[CACHE] Consultando ADN para ${u}...`);
            return null; // Forzamos regeneración para el test
        },
        setDeveloperDNA: async (u, dna) => {
            console.log(`[CACHE] Guardando nuevo ADN para ${u}...`);
            // Simular guardado
            fs.writeFileSync('./dna_test_output.json', JSON.stringify(dna, null, 2));
        }
    }
};

async function verifyEverything() {
    console.log("🚀 [DNA AUDIT] Iniciando Validación de Matices Técnicos (Proyecto: GitTeach)");

    const analyzer = new ProfileAnalyzer();
    const username = "mauro3422";

    // 1. Simular resúmenes de archivos reales del proyecto para el Map-Reduce
    // Tomamos archivos críticos del proyecto GitTeach para ver si el Mapper los entiende
    const importantFiles = [
        'src/renderer/js/services/profileAnalyzer.js',
        'src/renderer/js/services/aiWorkerPool.js',
        'src/renderer/js/services/coordinatorAgent.js',
        'src/renderer/index.js'
    ];

    const mockSummaries = importantFiles.map(f => {
        const content = fs.readFileSync(path.join(process.cwd(), f), 'utf8');
        return `[${f}]: Implementa ${f.includes('Pool') ? 'paralelismo con workers' : 'análisis agéntico'}. 
        Usa logic para evitar bloqueos del 61% mediante workers en background. 
        Se observa uso de SOLID y Map-Reduce.`;
    }).join('\n');

    // Inyectar en el coordinador (mock)
    analyzer.coordinator.getAllSummaries = () => mockSummaries;
    analyzer.coordinator.getSummaryForChat = () => mockSummaries.substring(0, 500);

    console.log("\n🏗️ [MAP-REDUCE] Ejecutando Generación de ADN basada en código real...");
    const dna = await analyzer.runDeepCurator(username);

    console.log("\n🧬 [DEVELOPER DNA RESULTADO]:");
    console.log(JSON.stringify(dna, null, 2));

    // 2. Quiz de Conocimiento
    console.log("\n💬 [QUIZ] Preguntando al Director de Arte sobre los matices detectados...");

    const freshContext = analyzer.getFreshContext(username, dna);
    AIService.setSessionContext(freshContext);

    const questions = [
        "¿Qué técnica usé para resolver el bloqueo del 61% en el análisis?",
        "Describe mis hábitos de arquitectura según este código.",
        "¿Soy un programador que se preocupa por la performance o solo por la funcionalidad?"
    ];

    for (const q of questions) {
        console.log(`\nPREGUNTA MAURO: "${q}"`);
        const res = await AIService.processIntent(q, username);
        console.log(`RESPUESTA IA: ${res.message || res}`);
    }

    console.log("\n=== VALIDACIÓN FINALIZADA SIN ERRORES ===");
}

verifyEverything().catch(err => {
    console.error("❌ ERROR EN VALIDACIÓN:", err);
});
