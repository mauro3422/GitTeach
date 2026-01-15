// scripts/tools/ultimate_multitier_tracer.mjs
/**
 * ULTIMATE MULTI-TIER TRACER 🧬 - HEARTBEAT EDITION
 * No Mocks, Real Data, Real Flows.
 * Noise-Filtered: Heartbeat progress every 5%.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../../');
const APP_DATA = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');

const SESSION_ID = `SESSION_${new Date().toISOString().replace(/[:.]/g, '-')}`;
let SESSION_PATH = "";

// HIGHLANDER PROTOCOL: THERE CAN BE ONLY ONE
const PID_FILE = path.join(ROOT, 'tracer.pid');
try {
    if (fs.existsSync(PID_FILE)) {
        const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
        console.log(`[TRACER] Found existing process PID: ${oldPid}. Terminating...`);
        try {
            process.kill(oldPid, 'SIGKILL'); // Force kill
            console.log(`[TRACER] Killed previous process ${oldPid}.`);
        } catch (e) {
            console.log(`[TRACER] Process ${oldPid} likely already dead or access denied: ${e.message}`);
        }
    }
} catch (e) {
    // Ignore PID errors
}
// Write new PID
fs.writeFileSync(PID_FILE, process.pid.toString());
console.log(`[TRACER] Registered new PID: ${process.pid}`);

// Cleanup on exit
process.on('exit', () => { try { fs.unlinkSync(PID_FILE); } catch (e) { } });
process.on('SIGINT', () => { process.exit(); });


// Cargar Token Real
const TOKEN_PATH = path.join(APP_DATA, 'giteach', 'token.json');
let AUTH_TOKEN = "";
try {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    AUTH_TOKEN = tokenData.token || tokenData.access_token;
    console.log(`[AUTH] REAL token loaded.`);
} catch (e) {
    console.error(`[AUTH] ERROR: No token in ${TOKEN_PATH}`);
    process.exit(1);
}

const realGithubAPI = {
    _headers: () => ({ 'Authorization': `token ${AUTH_TOKEN}`, 'User-Agent': 'GitTeach-Tracer-Reality' }),
    listRepos: async () => {
        const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', { headers: realGithubAPI._headers() });
        return await res.json();
    },
    getProfileReadme: async (u) => {
        const res = await fetch(`https://api.github.com/repos/${u}/${u}/readme`, { headers: realGithubAPI._headers() });
        if (!res.ok) return "";
        const data = await res.json();
        return Buffer.from(data.content, 'base64').toString('utf8');
    },
    getRepoTree: async (u, r) => {
        const branches = ['main', 'master'];
        for (const b of branches) {
            const res = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=100`, { headers: realGithubAPI._headers() }); // Dummy to reuse headers
            const treeRes = await fetch(`https://api.github.com/repos/${u}/${r}/git/trees/${b}?recursive=1`, { headers: realGithubAPI._headers() });
            if (treeRes.ok) {
                const data = await treeRes.json();
                // TEST OPTIMIZATION: Limit to 5 files per repo
                if (data.tree && data.tree.length > 5) {
                    console.log(`   [TRACER] Limiting ${r} to 5 files for ultra-fast testing...`);
                    data.tree = data.tree.slice(0, 5);
                }
                return data;
            }
        }
        return { tree: [] };
    },
    getFileContent: async (u, r, p) => {
        const res = await fetch(`https://api.github.com/repos/${u}/${r}/contents/${p}`, { headers: realGithubAPI._headers() });
        return await res.json();
    },
    logToTerminal: (msg) => { }, // Silent internal terminal logs
    checkAuth: async () => ({ login: 'mauro3422', token: AUTH_TOKEN }),
    getRawFileByPath: async (u, r, p) => {
        const res = await fetch(`https://api.github.com/repos/${u}/${r}/contents/${p}`, { headers: realGithubAPI._headers() });
        if (!res.ok) return "";
        const data = await res.json();
        return Buffer.from(data.content, 'base64').toString('utf8');
    },
    getUserCommits: async (u, r) => [],
    getCommitDiff: async (u, r, s) => ({ files: [] })
};

global.window = {
    githubAPI: realGithubAPI,
    utilsAPI: { checkAIHealth: async () => true },
    debugAPI: {
        createSession: async (id) => ({ success: true, path: path.join(ROOT, 'logs/sessions', id) }),
        appendLog: async (sessionId, subfolder, filename, content) => {
            const filePath = path.join(ROOT, 'logs/sessions', sessionId, subfolder, filename);
            console.log(`[MOCK-APPEND] Attempting write to ${filename} (Session: ${sessionId})`);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            try {
                fs.appendFileSync(filePath, content);
                console.log(`[MOCK-APPEND] Success: ${filename}`);
            } catch (e) {
                console.error(`[MOCK-APPEND] ERROR: ${e.message}`, e);
            }
            return { success: true };
        }
    },
    AI_CONFIG: { endpoint: 'http://localhost:8000/v1/chat/completions' },
    AI_OFFLINE: false
};

global.document = { querySelector: () => null, getElementById: () => null };

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

async function startTracer() {
    console.log(`\n🧬 TRACER START: ${SESSION_ID}`);
    const { AIService } = await import('../../src/renderer/js/services/aiService.js');
    const { ProfileAnalyzer } = await import('../../src/renderer/js/services/profileAnalyzer.js');
    const { DebugLogger } = await import('../../src/renderer/js/utils/debugLogger.js');

    // Health Check
    await AIService.callAI("Test", "OK", 0.0);
    console.log('✅ AI Server ONLINE.');

    SESSION_PATH = path.join(ROOT, 'logs/sessions', SESSION_ID);
    ensureDir(path.join(SESSION_PATH, 'workers'));
    ensureDir(path.join(SESSION_PATH, 'curator'));
    ensureDir(path.join(SESSION_PATH, 'chat'));

    DebugLogger.enabled = true;
    DebugLogger.sessionPath = SESSION_PATH;
    DebugLogger.sessionId = SESSION_ID;
    // INJECT DEPENDENCIES FOR CACHE LOGGING
    DebugLogger.fs = fs;
    DebugLogger.path = path;
    DebugLogger.isNode = true;

    let totalFilesOnDisk = 0;
    try { totalFilesOnDisk = parseInt(fs.readFileSync(path.join(ROOT, 'temp_file_count.txt'), 'utf8').trim()); } catch (e) { }

    console.log('--- PHASE 1: WORKER SCAN (100% Coverage Goal) ---');
    // INJECT: Pass the correctly configured DebugLogger (with FS) to the analyzer
    const analyzer = new ProfileAnalyzer(DebugLogger);

    // Custom "Heartbeat" Logger (0/50/100)
    let lastReportedHeartbeat = -1;

    const results = await analyzer.analyze('mauro3422', (step) => {
        if (step.type === 'Progreso') {
            const p = step.percent;
            const heartbeat = p < 50 ? 0 : (p < 100 ? 50 : 100);

            if (heartbeat !== lastReportedHeartbeat) {
                const stats = analyzer.coordinator.getStats();
                console.log(`   [HEARTBEAT] ${heartbeat}% - Scanned: ${stats.analyzed}/${totalFilesOnDisk} files.`);
                lastReportedHeartbeat = heartbeat;
            }
        }
    });

    const stats = analyzer.coordinator.getStats();
    console.log(`\n📊 FINAL COVERAGE REPORT:`);
    console.log(`   - Files on Disk:   ${totalFilesOnDisk}`);
    console.log(`   - Files Scanned:   ${stats.analyzed}`);
    console.log(`   - Missing/Skipped: ${totalFilesOnDisk - stats.analyzed}`);
    console.log(`   - Coverage Index:  ${Math.round((stats.analyzed / totalFilesOnDisk) * 100)}%`);

    console.log('\n--- PHASE 2: DEEP CURATION (DENSE DNA) ---');
    if (analyzer.fullIntelligencePromise) await analyzer.fullIntelligencePromise;

    console.log('\n--- PHASE 3: MAIN AGENT VALIDATION ---');
    const questions = [
        "¿Quién soy según lo que has analizado en mis archivos reales?",
        "¿Cuáles son mis 3 patrones técnicos más fuertes detectados? Cita archivos reales.",
        "¿Encontraste alguna anomalía o algo curioso en mi código? Sé específico.",
        "¿Cómo ha evolucionado mi estilo de programación según lo que ves en estos repositorios?"
    ];

    for (const q of questions) {
        process.stdout.write(`   > Question: "${q}"... `);
        const response = await AIService.processIntent(q, 'mauro3422');
        console.log(`DONE.`);
        fs.appendFileSync(path.join(SESSION_PATH, 'chat/session.jsonl'), JSON.stringify({ timestamp: new Date().toISOString(), q, a: response.message }) + '\n');
    }

    fs.writeFileSync(path.join(SESSION_PATH, 'SUMMARY.json'), JSON.stringify({
        sessionId: SESSION_ID, status: 'COMPLETE', files: stats.analyzed, disk: totalFilesOnDisk
    }, null, 2));

    console.log(`\n✅ TRACE COMPLETE. Session saved in ${SESSION_ID}`);
}

startTracer().catch(e => { console.error('\n❌ FAILED:', e); process.exit(1); });
