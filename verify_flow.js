
// USANDO API REAL DE GITHUB (Sin Mocks)
const USERNAME = "mauro3422";
// OPCIONAL: Si tienes un token personal, pégalo aquí para evitar 401 en la API de Trees
const AUTH_TOKEN = "";

const mockGithubAPI = {
    _getHeaders: () => {
        const headers = { 'User-Agent': 'GitTeach-App' };
        if (AUTH_TOKEN) headers['Authorization'] = `token ${AUTH_TOKEN}`;
        return headers;
    },
    listRepos: async () => {
        const res = await fetch(`https://api.github.com/users/${USERNAME}/repos`, {
            headers: mockGithubAPI._getHeaders()
        });
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    },
    getRepoReadme: async (u, r) => {
        const res = await fetch(`https://api.github.com/repos/${u}/${r}/readme`, {
            headers: mockGithubAPI._getHeaders()
        });
        if (!res.ok) return { content: null, error: "Not found" };
        return await res.json();
    },
    getProfileReadme: async (u) => {
        const res = await fetch(`https://api.github.com/repos/${u}/${u}/readme`, {
            headers: mockGithubAPI._getHeaders()
        });
        if (!res.ok) return { content: null, error: "Not found" };
        return await res.json();
    },
    getRepoTree: async (u, r, recurse) => {
        const branches = ["main", "master"];
        for (const b of branches) {
            const url = `https://api.github.com/repos/${u}/${r}/git/trees/${b}?recursive=${recurse ? 1 : 0}`;
            const res = await fetch(url, { headers: mockGithubAPI._getHeaders() });

            if (res.status === 401 || res.status === 403) {
                console.log(`\x1b[31m[GITHUB ERROR] ${res.status} en Tree API. Probablemente necesites un TOKEN para acceso recursivo.\x1b[0m`);
                return { tree: [] };
            }

            console.log(`[DEBUG] Fetch Tree: ${url} -> ${res.status}`);
            if (res.ok) return await res.json();
        }
        return { tree: [] };
    },
    getFileContent: async (u, r, p) => {
        const url = `https://api.github.com/repos/${u}/${r}/contents/${p}`;
        const res = await fetch(url, { headers: mockGithubAPI._getHeaders() });
        console.log(`[DEBUG] Fetch File: ${url} -> ${res.status}`);
        if (!res.ok) return { content: "" };
        return await res.json();
    },
    logToTerminal: (msg) => {
        // Resaltar detecciones de código interesantes
        if (msg.includes(".py") || msg.includes(".js") || msg.includes(".cpp")) {
            console.log(`\x1b[33m[CODE ALERT]\x1b[0m ${msg}`);
        } else {
            console.log(`\x1b[36m[TELEMETRÍA REAL]\x1b[0m ${msg}`);
        }
    }
};

global.window = {
    githubAPI: mockGithubAPI,
    location: { reload: () => console.log("[WINDOW] Reloading...") }
};

// Mock del DOM para los servicios
global.document = {
    getElementById: (id) => ({
        value: "# README Profile\n",
        innerText: "mauro3422",
        dataset: { login: "mauro3422" },
        parentElement: {},
        dispatchEvent: (e) => console.log(`[DOM] Evento ${e.type} disparado en ${id}`)
    }),
};
global.Event = class { constructor(type) { this.type = type; } };
global.HTMLElement = class { };

async function verifyAgenticFlow() {
    console.log("\x1b[1m\x1b[32m--- INICIANDO VERIFICACIÓN DE FLUJO AGÉNTICO ---\x1b[0m\n");

    try {
        // 1. Probar ProfileAnalyzer (Análisis Paralelo al Login)
        const { ProfileAnalyzer } = await import('./src/renderer/js/services/profileAnalyzer.js');
        const analyzer = new ProfileAnalyzer();

        console.log("👉 TRABAJO 1: Simulando Login (ProfileAnalyzer)...");
        const profileResults = await analyzer.analyze("mauro3422", (step) => {
            console.log(`🛠️ [App Progress] ${step}`);
        });

        console.log("\n✅ [FORENSE] RESULTADOS DEL ANÁLISIS AGÉNTICO:");
        console.log(`   - Lenguajes Principales: ${profileResults.mainLangs.join(', ')}`);
        console.log(`   - Repos Analizados Deep: ${profileResults.deepScan.length}`);

        profileResults.deepScan.forEach(scan => {
            console.log(`\n      📦 REPO: ${scan.repo}`);
            console.log(`      📂 ESTRUCTURA DETECTADA: ${scan.structure}`);
            scan.auditedSnippets.forEach(s => {
                console.log(`      📄 ARCHIVO: ${s.file}`);
                console.log(`      📝 SNIPPET (First 100 chars): "${s.content.substring(0, 100).replace(/\n/g, ' ')}..."`);
            });
        });

        console.log("\n----------------------------------------------\n");

        // 2. Probar AIService (Interacción por Chat)
        const { AIService } = await import('./src/renderer/js/services/aiService.js');
        const chatInput = "Hazme un resumen técnico de lo que has aprendido analizando mi código";

        console.log(`👉 TRABAJO 2: Simulando Chat (${chatInput})...`);
        const chatResult = await AIService.processIntent(chatInput, "mauro3422");

        console.log("\n✅ RESPUESTA DEL CHAT:");
        console.log(chatResult.message);

    } catch (e) {
        console.error("❌ Error en la verificación:", e);
    }
}

verifyAgenticFlow();
