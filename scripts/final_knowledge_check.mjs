
const { AIService } = require('./src/renderer/js/services/aiService.js');

async function quizAI() {
    console.log("🧠 [AI KNOWLEDGE QUIZ] Verificando si el Director de Arte conoce tu ADN...");

    // Simulamos el contexto que el ProfileAnalyzer inyectaría tras el Map-Reduce temático
    const deepContext = `
    --- MEMORIA PROFUNDA DEL DIRECTOR DE ARTE ---
    USUARIO: mauro3422
    VEREDICTO: Senior Technical Architect & AI Systems Specialist

    [ADN TÉCNICO]:
    - ARQUITECTURA: Uso magistral de patrones de diseño paralelos. Implementó un Pool de Workers (aiWorkerPool.js) para evitar el estancamiento del 61% en el análisis masivo.
    - HÁBITOS: Consistencia extrema en el uso de tipado dinámico pero estructurado, manejo robusto de promesas (Promise.all) y modularidad SOLID.
    - STACK: Experto en Electron, integración de LLMs locales y arquitecturas de datos via Map-Reduce temático.

    RASGOS DETECTADOS:
    - [Arquitectura 95%]: Uso de Mappers especializados para no perder matices.
    - [Hábitos 90%]: Naming descriptivo y flujo de errores controlado.
    - [Tecnología 98%]: Implementó persistencia metabólica para no olvidar datos entre sesiones.
    `;

    AIService.setSessionContext(deepContext);

    const quiz = [
        { q: "¿Qué hiciste para que el análisis de mis 800 archivos no se quedara trabado al 61%?", label: "Bloqueo 61%" },
        { q: "¿Cómo te aseguras de detectar 'matices' en mi código sin que se te olvide nada por el límite de contexto?", label: "Deep Nuance / Map-Reduce" },
        { q: "Si alguien me pregunta por mis hábitos de programación, ¿qué le dirías basado en lo que has visto de mí?", label: "Hábitos Técnicos" }
    ];

    for (const item of quiz) {
        console.log(`\n❓ [${item.label}]: ${item.q}`);
        try {
            const response = await AIService.callAI(
                "# DIRECTOR DE ARTE MEMORY CHECK\nUsa el contexto para responder de forma técnica.",
                item.q,
                0.3
            );
            console.log(`🤖 IA: ${response}`);
        } catch (e) {
            console.error(`❌ Error en IA: ${e.message}`);
        }
    }

    console.log("\n✅ [QUIZ COMPLETE]");
}

quizAI().catch(console.error);
