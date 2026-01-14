
// Mock de las APIs globales de Electron para la parte de GitHub
const mockGithubAPI = {
    listRepos: async () => [
        { name: "Giteach", language: "JavaScript" },
        { name: "LifeSimulatorCPP", language: "C++" },
        { name: "SmartShader", language: "GLSL" }
    ],
    logToTerminal: (msg) => console.log(`[TERMINAL] ${msg}`)
};

global.window = { githubAPI: mockGithubAPI };

// Mock del DOM para que AIToolbox no explote en Node
global.document = {
    getElementById: (id) => ({
        value: "# README Profile\n",
        dispatchEvent: (e) => console.log(`[DOM] Evento ${e.type} disparado en ${id}`)
    }),
};
global.Event = class { constructor(type) { this.type = type; } };

async function runRealTest() {
    console.log("🤖 Conectando con LFM 2.5 en localhost:8000...");

    try {
        // Importamos el AIService real
        const { AIService } = await import('./src/renderer/js/services/aiService.js');

        const userInput = "Escribe una biografía para mi README analizando mis proyectos";
        console.log(`💬 Usuario: "${userInput}"`);

        console.log("⏳ La IA está procesando (Router -> Constructor -> Ejecutor)...");
        const result = await AIService.processIntent(userInput, "mauro3422");

        console.log("\n--- RESPUESTA FINAL DE LA IA ---");
        console.log(result.message);
        console.log("--------------------------------\n");
    } catch (e) {
        console.error("❌ Error en la prueba real:", e);
    }
}

runRealTest();
