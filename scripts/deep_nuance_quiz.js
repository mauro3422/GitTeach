
const { ProfileAnalyzer } = require('./src/renderer/js/services/profileAnalyzer.js');
const { AIService } = require('./src/renderer/js/services/aiService.js');

async function testNuances() {
    console.log("🔍 [AUDIT] Iniciando Quiz de Matices Técnicos...");
    const analyzer = new ProfileAnalyzer();

    // 1. Simular una Memoria Profunda ya generada sobre este proyecto
    const mockDeepMemory = `
    [ADN TÉCNICO]: El desarrollador (mauro3422) tiene una fuerte inclinación por la concurrencia paralela y la gestión de estados asíncronos. 
    Implementó un sistema de "Workers" para mitigar cuellos de botella del 61%, lo que demuestra pensamiento sistémico.
    [PUNTOS DE DOLOR]: Resolvió la pérdida de contexto mediante un pipeline de Map-Reduce que destila el 100% de los archivos en lotes de 20.
    [VEREDICTO]: Desarrollador Senior con enfoque en Arquiectura de Inteligencia y Performance.
    `;

    const freshContext = analyzer.getFreshContext("mauro3422", mockDeepMemory);
    AIService.setSessionContext(freshContext);

    console.log("\n--- PREGUNTA DE MATIZ 1: ARQUITECTURA ---");
    const q1 = "¿Qué técnica específica usé para que el análisis no se detuviera al 61%?";
    console.log("MAURO: " + q1);
    const r1 = await AIService.processIntent(q1, "mauro3422");
    console.log("IA: " + r1.message);

    console.log("\n--- PREGUNTA DE MATIZ 2: TALENTO ---");
    const q2 = "Basado en mi código, ¿soy más un front-end básico o un arquitecto de sistemas de IA?";
    console.log("MAURO: " + q2);
    const r2 = await AIService.processIntent(q2, "mauro3422");
    console.log("IA: " + r2.message);

    console.log("\n--- PREGUNTA DE MATIZ 3: MEMORIA ---");
    const q3 = "¿Cómo me aseguro de que no 'olvides' mis archivos de baja prioridad cuando charlamos?";
    console.log("MAURO: " + q3);
    const r3 = await AIService.processIntent(q3, "mauro3422");
    console.log("IA: " + r3.message);

    console.log("\n=== AUDIT DE MATICES FINALIZADO ===");
}

testNuances().catch(console.error);
