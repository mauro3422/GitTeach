
// Mock de las APIs globales de Electron que la herramienta espera
const mockGithubAPI = {
    listRepos: async () => [
        { name: "Giteach", language: "JavaScript", stargazers_count: 10 },
        { name: "LifeSimulatorCPP", language: "C++", description: "Simulation engine" },
        { name: "SmartShader", language: "GLSL" },
        { name: "DocGen", language: "Python" },
        { name: "WebScraper", language: "JavaScript" }
    ]
};

// Simulamos el entorno de navegador/electron
global.window = { githubAPI: mockGithubAPI };

// Importación dinámica (Node 16+ soporta ESM o cargamos el archivo)
import('./src/renderer/js/services/tools/autoBioTool.js').then(async (module) => {
    const tool = new module.AutoBioTool();
    console.log("🚀 Iniciando prueba de AutoBioTool...");

    try {
        const result = await tool.execute({}, "mauro3422");
        console.log("\n--- RESULTADO DEL COMANDO ---");
        console.log("Success:", result.success);
        console.log("Details:", result.details);
        console.log("\n--- CONTENIDO GENERADO ---");
        console.log(result.content);
        console.log("----------------------------\n");
    } catch (e) {
        console.error("❌ Error en la prueba:", e);
    }
}).catch(err => {
    console.error("❌ Falló la carga del módulo:", err);
});
