const fs = require('fs');
const path = require('path');
const LOG_FILE = './verify_flow_output.txt';

// Recolector de logs
const logs = [];

function log(msg) {
    logs.push(String(msg));
}

function saveLogs() {
    fs.writeFileSync(LOG_FILE, logs.join('\n'), 'utf8');
    console.log(`\nLogs saved to ${LOG_FILE}`);
}

// USANDO API REAL DE GITHUB CON AUTH
const USERNAME = "mauro3422";

// Cargar token desde AppData (donde Electron lo guarda)
const TOKEN_PATH = path.join(process.env.APPDATA, 'giteach', 'token.json');
let AUTH_TOKEN = "";
try {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    AUTH_TOKEN = tokenData.token;
    log(`[AUTH] Token loaded successfully`);
} catch (e) {
    log(`[AUTH] WARNING: No token found - using public API (limited)`);
}

const mockGithubAPI = {
    _getHeaders: () => {
        const headers = { 'User-Agent': 'GitTeach-App' };
        if (AUTH_TOKEN) headers['Authorization'] = `token ${AUTH_TOKEN}`;
        return headers;
    },
    listRepos: async () => {
        const res = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=10`, {
            headers: mockGithubAPI._getHeaders()
        });
        const data = await res.json();
        log(`[API] listRepos: ${res.status} - Got ${Array.isArray(data) ? data.length : 0} repos`);
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
        log(`[API] getProfileReadme: ${res.status}`);
        if (!res.ok) return { content: null, error: "Not found" };
        return await res.json();
    },
    getRepoTree: async (u, r, recurse) => {
        const branches = ["main", "master"];
        for (const b of branches) {
            const url = `https://api.github.com/repos/${u}/${r}/git/trees/${b}?recursive=${recurse ? 1 : 0}`;
            const res = await fetch(url, { headers: mockGithubAPI._getHeaders() });
            if (res.status === 401 || res.status === 403) {
                log(`[API] Tree ${r}: ${res.status} BLOCKED`);
                return { tree: [] };
            }
            if (res.ok) {
                const data = await res.json();
                log(`[API] Tree ${r}/${b}: ${data.tree?.length || 0} files`);
                return data;
            }
        }
        return { tree: [] };
    },
    getFileContent: async (u, r, p) => {
        const url = `https://api.github.com/repos/${u}/${r}/contents/${p}`;
        const res = await fetch(url, { headers: mockGithubAPI._getHeaders() });
        if (!res.ok) {
            log(`[API] File ${r}/${p}: ${res.status} NOT FOUND`);
            return { content: "" };
        }
        log(`[API] File ${r}/${p}: OK`);
        return await res.json();
    },
    logToTerminal: (msg) => {
        // Capturar telemetría limpia
        const clean = String(msg).replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[️✨🔍🚀📂📄⚠✅🧩🎯🛠📝👁📊🏗]/g, '').trim();
        if (clean) {
            log(`[TEL] ${clean}`);
            console.log(`[TEL] ${clean}`); // También a consola real
        }
    }
};

global.window = {
    githubAPI: mockGithubAPI,
    location: { reload: () => { } },
    // Mock de cache para testing
    cacheAPI: {
        _cache: {},
        getRepo: async (owner, repo) => global.window.cacheAPI._cache[`${owner}/${repo}`] || null,
        setRepo: async (owner, repo, data) => { global.window.cacheAPI._cache[`${owner}/${repo}`] = data; },
        needsUpdate: async (owner, repo, filePath, sha) => {
            const key = `${owner}/${repo}:${filePath}`;
            const cached = global.window.cacheAPI._cache[key];
            return !cached || cached.sha !== sha;
        },
        setFileSummary: async (owner, repo, filePath, sha, summary, content) => {
            const key = `${owner}/${repo}:${filePath}`;
            global.window.cacheAPI._cache[key] = { sha, summary, contentSnippet: content };
        },
        getFileSummary: async (owner, repo, filePath) => {
            const key = `${owner}/${repo}:${filePath}`;
            return global.window.cacheAPI._cache[key] || null;
        },
        hasRepoChanged: async (owner, repo, treeSha) => {
            const cached = global.window.cacheAPI._cache[`${owner}/${repo}`];
            return !cached || cached.treeSha !== treeSha;
        },
        setRepoTreeSha: async (owner, repo, treeSha) => {
            if (!global.window.cacheAPI._cache[`${owner}/${repo}`]) {
                global.window.cacheAPI._cache[`${owner}/${repo}`] = {};
            }
            global.window.cacheAPI._cache[`${owner}/${repo}`].treeSha = treeSha;
        },
        getStats: async () => ({ repoCount: Object.keys(global.window.cacheAPI._cache).length }),
        clear: async () => { global.window.cacheAPI._cache = {}; }
    }
};

global.document = {
    getElementById: (id) => ({
        value: "# README Profile\n",
        innerText: "mauro3422",
        dataset: { login: "mauro3422" },
        parentElement: {},
        dispatchEvent: () => { }
    }),
};
global.Event = class { constructor(type) { this.type = type; } };
global.HTMLElement = class { };

async function verifyAgenticFlow() {
    log("=== VERIFY FLOW LOG ===");
    log(`Timestamp: ${new Date().toISOString()}`);
    log("");

    try {
        // 1. ProfileAnalyzer
        const { ProfileAnalyzer } = await import('./src/renderer/js/services/profileAnalyzer.js');
        const analyzer = new ProfileAnalyzer();

        log(">>> STEP 1: ProfileAnalyzer.analyze()");
        log("");

        const results = await analyzer.analyze("mauro3422", (step) => {
            const msg = step.message || String(step);
            const clean = msg.replace(/<[^>]*>/g, '');
            log(`  [Progress] ${clean}`);
            console.log(`  [Progress] ${clean}`); // También a consola real
        });

        log("");
        log("=== ANALYSIS RESULTS ===");
        log(`Main Languages: ${results.mainLangs.join(', ') || 'None detected'}`);
        log(`Deep Scan Repos: ${results.deepScan?.length || 0}`);
        log(`AI Summary: ${results.summary}`);
        log(`Suggestions: ${results.suggestions?.join(', ') || 'None'}`);

        log("");
        log("--- Deep Scan Details ---");
        if (results.deepScan && results.deepScan.length > 0) {
            results.deepScan.forEach((scan, i) => {
                log(`[${i + 1}] Repo: ${scan.repo}`);
                log(`    Structure: ${scan.structure}`);
                if (Array.isArray(scan.auditedSnippets) && scan.auditedSnippets.length > 0) {
                    scan.auditedSnippets.forEach(s => {
                        log(`    File: ${s.file}`);
                        const snippet = s.content.substring(0, 100).replace(/\n/g, ' ');
                        log(`    Code: "${snippet}..."`);
                    });
                } else {
                    log(`    Snippets: ${JSON.stringify(scan.auditedSnippets)}`);
                }
            });
        } else {
            log("No deep scan results available.");
        }

        // NUEVO: Esperar a que el análisis en background termine (IA + Descargas)
        log("");
        const msgStep2 = ">>> STEP 2: Waiting for Full AI Intelligence (Background Workers + Learning)...";
        log(msgStep2);
        console.log(`\n${msgStep2}`);

        if (analyzer.fullIntelligencePromise) {
            await analyzer.fullIntelligencePromise;
            log("  ✅ Full background intelligence complete!");
            console.log("  ✅ Full background intelligence complete!");
        } else {
            log("  ℹ️ No background learning needed");
            console.log("  ℹ️ No background learning needed");
        }

        const finalStats = analyzer.coordinator.getStats();
        const statMsg = `  📊 Final Analysis: ${finalStats.analyzed}/${finalStats.totalFiles} files (${finalStats.progress}%)`;
        log(statMsg);
        console.log(statMsg);

        log("");
        const msgStep3 = ">>> STEP 3: Refreshing Chat Context with Deep Knowledge";
        log(msgStep3);
        console.log(`\n${msgStep3}`);

        const { AIService } = await import('./src/renderer/js/services/aiService.js');

        // NUEVO: Obtener contexto fresco con todos los resúmenes de los workers
        const richContext = analyzer.getFreshContext("mauro3422");

        AIService.setSessionContext(richContext);
        log("[CONTEXTO INYECTADO AL CHAT (FRESH)]:");
        log(richContext.substring(0, 1000) + "...");
        console.log("[CONTEXTO INYECTADO AL CHAT (FRESH)]");

        // ENCUESTA: Múltiples preguntas para verificar conocimiento de la IA
        log("");
        const msgStep4 = ">>> STEP 4: AI Knowledge Quiz";
        log(msgStep4);
        console.log(`\n${msgStep4}`);

        const questions = [
            "Hola, que sabes de mi?",
            "En qué lenguajes de programación trabajo principalmente?",
            "Cuál es mi proyecto más grande?"
        ];

        for (const q of questions) {
            log(`\n--- PREGUNTA: "${q}" ---`);
            console.log(`\n--- PREGUNTA: "${q}" ---`);
            try {
                const response = await AIService.processIntent(q, "mauro3422");
                const respMsg = `[RESPUESTA]: ${response.message || JSON.stringify(response)}`;
                log(respMsg);
                console.log(respMsg);
            } catch (e) {
                log(`[ERROR]: ${e.message}`);
                console.error(`[ERROR]: ${e.message}`);
            }
        }

        log("");
        log("=== VERIFICATION COMPLETE ===");
        console.log("\n=== VERIFICATION COMPLETE ===");

    } catch (e) {
        log(`ERROR: ${e.message}`);
        log(e.stack);
    } finally {
        saveLogs();
    }
}

verifyAgenticFlow();
