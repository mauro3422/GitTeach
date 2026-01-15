/**
 * 🧬 METABOLIC FORENSIC TRACER
 * Version: 2.4 (Correct Init)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../../');
const APP_DATA = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');

const SESSION_ID = `METABOLIC_${new Date().toISOString().replace(/[:.]/g, '-')}`;
const SESSION_PATH = path.join(ROOT, 'logs', 'sessions', SESSION_ID);

const TOKEN_PATH = path.join(APP_DATA, 'giteach', 'token.json');
let AUTH_TOKEN = "";
try {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    AUTH_TOKEN = tokenData.token || tokenData.access_token;
} catch (e) {
    console.error(`[AUTH] ERROR: No token in ${TOKEN_PATH}`);
    process.exit(1);
}

const realGithubAPI = {
    _headers: () => ({ 'Authorization': `token ${AUTH_TOKEN}`, 'User-Agent': 'GitTeach-Tracer-Metabolic' }),
    logToTerminal: () => { },
    checkAuth: async () => ({ login: 'mauro3422', token: AUTH_TOKEN }),
};

global.window = {
    githubAPI: realGithubAPI,
    utilsAPI: { checkAIHealth: async () => true },
    debugAPI: {
        createSession: async (id) => {
            if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true });
            return { success: true, path: SESSION_PATH };
        },
        appendLog: async (sessionId, subfolder, filename, content) => {
            const filePath = path.join(ROOT, 'logs', 'sessions', sessionId, subfolder, filename);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(filePath, content);
            return { success: true };
        }
    },
    AI_OFFLINE: false
};
global.document = { querySelector: () => null, getElementById: () => null };

async function run() {
    try {
        process.stdout.write(`\n🧬 METABOLIC TRACER START: ${SESSION_ID}\n`);

        const { AIService } = await import('../../src/renderer/js/services/aiService.js');
        const { ProfileAnalyzer } = await import('../../src/renderer/js/services/profileAnalyzer.js');
        const { DebugLogger } = await import('../../src/renderer/js/utils/debugLogger.js');
        const { CacheRepository } = await import('../../src/renderer/js/utils/cacheRepository.js');

        DebugLogger.setEnabled(true);
        await DebugLogger.startSession();

        const analyzer = new ProfileAnalyzer(DebugLogger);

        console.log('\n--- ROUND 1: INITIAL IDENTITY ---');
        await AIService.processIntent("SYSTEM_EVENT: INITIAL_GREETING", "mauro3422");

        const baselineDNA = {
            bio: "Mauro is a Python scripter focused on basic automation.",
            traits: [
                { name: "Architecture", score: 35, details: "Single file scripts", evidence: "script.py" }
            ],
            verdict: "Junior Scripter"
        };
        await CacheRepository.setDeveloperDNA('mauro3422', baselineDNA);
        AIService.setSessionContext("IDENTIDAD BASE: Scripter de Python.");

        console.log('\n--- ROUND 2: TECHNICAL EVOLUTION ---');
        const evolvedCuration = {
            mainLangs: ["C++", "Vulkan", "Python"],
            bio: "Graphics Systems Architect. Master of Vulkan and performance simulations.",
            traits: [
                { name: "Architecture", score: 88, details: "Advanced GPU architecture", evidence: "vulkan.h" },
                { name: "Performance", score: 92, details: "Low-latency GPU optimization", evidence: "shader.glsl" }
            ],
            verdict: "Graphics & Simulation Specialist",
            anomalies: ["Vulkan in web folder"]
        };

        console.log('   > Running Metabolic Digestion...');
        const digestResult = await analyzer.metabolicAgent.digest(baselineDNA, evolvedCuration);

        console.log(`   > Evolution Significant: ${digestResult.isSignificant}`);
        console.log(`   > Evolved Title: ${digestResult.report.profileUpdate.title}`);

        const evolvedContext = analyzer.getFreshContext("mauro3422", evolvedCuration, digestResult.report.profileUpdate);
        AIService.setSessionContext(evolvedContext);

        const metabolicPrompt = analyzer.metabolicAgent.generateMetabolicPrompt(digestResult.report, "mauro3422");
        console.log('\n--- PROACTIVE REACTION ---');
        const reaction = await AIService.processIntent(metabolicPrompt, "mauro3422");
        console.log(`     AI: "${reaction.message}"`);

        console.log('\n--- VERIFICATION CHAT ---');
        const questions = ["¿Quién soy ahora?", "¿Qué cambió en mi perfil técnico?"];

        for (const q of questions) {
            process.stdout.write(`   > User: "${q}"... `);
            const res = await AIService.processIntent(q, 'mauro3422');
            console.log(`DONE. AI: "${res.message.substring(0, 100)}..."`);
        }

        console.log('\n✨ METABOLIC TRACER COMPLETE.');
    } catch (e) {
        console.error(`\n[FATAL TRACER ERROR]: ${e.message}`);
        console.error(e.stack);
        process.exit(1);
    }
}

run().catch(e => {
    console.error(`\n[UNCAUGHT ERROR]: ${e.message}`);
    process.exit(1);
});
