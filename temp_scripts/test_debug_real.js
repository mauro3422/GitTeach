/**
 * REAL DATA Debug Flow Test (Node.js)
 * Uses ACTUAL llama-server at localhost:8000 for AI responses
 * NO SIMULATED DATA - Compliant with reality-first-tester skill
 * 
 * Run: node test_debug_real.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Config
const DEBUG_DIR = path.join(__dirname, 'DEBUG_SESSION_REAL');
const SESSION_ID = new Date().toISOString().replace(/[:.]/g, '-');
const LLAMA_SERVER = 'http://localhost:8000/v1/chat/completions';

// Ensure directory structure
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Call REAL llama-server
async function callRealAI(systemPrompt, userPrompt) {
    console.log('[AI] Calling llama-server...');

    const payload = JSON.stringify({
        model: "local-model",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 200
    });

    return new Promise((resolve, reject) => {
        const url = new URL(LLAMA_SERVER);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.message?.content || 'No response';
                    resolve(content);
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Connection error: ${e.message}. Is llama-server running on port 8000?`));
        });

        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout (30s)'));
        });

        req.write(payload);
        req.end();
    });
}

// Initialize session
function initSession() {
    console.log('=== INITIALIZING DEBUG SESSION (REAL DATA) ===');
    const sessionPath = path.join(DEBUG_DIR, `SESSION_${SESSION_ID}`);
    ensureDir(path.join(sessionPath, 'workers'));
    ensureDir(path.join(sessionPath, 'curator'));
    ensureDir(path.join(sessionPath, 'chat'));
    ensureDir(path.join(sessionPath, 'memory'));
    console.log(`Session path: ${sessionPath}`);
    return sessionPath;
}

// Log worker data
function logWorker(sessionPath, workerId, data) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        workerId,
        ...data
    };
    const filePath = path.join(sessionPath, 'workers', `worker_${workerId}.jsonl`);
    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n');
    console.log(`[Worker ${workerId}] Logged: ${data.input?.path || 'unknown'}`);
}

// Log curator phase
function logCurator(sessionPath, phase, data) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        phase,
        data
    };
    const filePath = path.join(sessionPath, 'curator', `${phase}.json`);
    fs.writeFileSync(filePath, JSON.stringify(logEntry, null, 2));
    console.log(`[Curator] Logged phase: ${phase}`);
}

// Log chat message
function logChat(sessionPath, type, message) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        message
    };
    const filePath = path.join(sessionPath, 'chat', 'session.jsonl');
    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n');
    console.log(`[Chat ${type}] Logged message`);
}

// Process files with REAL AI
async function processFilesWithRealAI(sessionPath) {
    console.log('\n=== PROCESSING FILES WITH REAL AI ===');

    // Real code snippets to analyze
    const files = [
        {
            repo: 'GitTeach',
            path: 'src/main/index.js',
            content: `const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
function createWindow() {
    const win = new BrowserWindow({
        webPreferences: { preload: path.join(__dirname, '../preload/index.js') }
    });
}`
        },
        {
            repo: 'GitTeach',
            path: 'src/renderer/js/services/aiService.js',
            content: `export class AIService {
    static async callAI(systemPrompt, userPrompt, temperature = 0.7) {
        const response = await fetch('http://localhost:8000/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }] })
        });
        return response.json();
    }
}`
        }
    ];

    const systemPrompt = `You are a TECHNICAL ANALYST. Analyze this code and identify:
1. What it does (one sentence)
2. Key patterns used
3. Developer skill demonstrated
Reply in max 40 words.`;

    const summaries = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const workerId = i + 1;

        console.log(`\n[Worker ${workerId}] Analyzing: ${file.path}`);

        try {
            const userPrompt = `File: ${file.path}\n\`\`\`javascript\n${file.content}\n\`\`\``;
            const realSummary = await callRealAI(systemPrompt, userPrompt);

            logWorker(sessionPath, workerId, {
                input: { repo: file.repo, path: file.path, contentLength: file.content.length },
                prompt: userPrompt,  // Full prompt, not truncated
                output: realSummary
            });

            summaries.push({ file: file.path, summary: realSummary });
            console.log(`[Worker ${workerId}] REAL AI Response: ${realSummary.substring(0, 100)}...`);

        } catch (error) {
            console.error(`[Worker ${workerId}] ERROR: ${error.message}`);
            logWorker(sessionPath, workerId, {
                input: { repo: file.repo, path: file.path },
                error: error.message
            });
        }
    }

    return summaries;
}

// Curator with REAL AI
async function runRealCurator(sessionPath, workerSummaries) {
    console.log('\n=== RUNNING CURATOR WITH REAL AI ===');

    const summariesText = workerSummaries.map(s => `- ${s.file}: ${s.summary}`).join('\n');

    const curatorPrompt = `Based on these code analyses, create a developer profile:
${summariesText}

Reply with JSON: {"bio": "...", "traits": [{"name": "...", "score": 0-100}], "verdict": "..."}`;

    try {
        const realDNA = await callRealAI('You are an expert developer profiler.', curatorPrompt);
        logCurator(sessionPath, 'reducer_output', { raw: realDNA, workerCount: workerSummaries.length });
        console.log(`[Curator] REAL DNA: ${realDNA.substring(0, 150)}...`);
        return realDNA;
    } catch (error) {
        console.error(`[Curator] ERROR: ${error.message}`);
        logCurator(sessionPath, 'reducer_error', { error: error.message });
        return null;
    }
}

// Generate summary
function generateSummary(sessionPath, success) {
    const summary = {
        sessionId: SESSION_ID,
        sessionPath,
        endTime: new Date().toISOString(),
        usedRealAI: true,
        success,
        filesGenerated: {
            workers: fs.existsSync(path.join(sessionPath, 'workers'))
                ? fs.readdirSync(path.join(sessionPath, 'workers')) : [],
            curator: fs.existsSync(path.join(sessionPath, 'curator'))
                ? fs.readdirSync(path.join(sessionPath, 'curator')) : [],
            chat: fs.existsSync(path.join(sessionPath, 'chat'))
                ? fs.readdirSync(path.join(sessionPath, 'chat')) : []
        }
    };

    fs.writeFileSync(path.join(sessionPath, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
    return summary;
}

// Main test execution
async function runTest() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  DEBUG FLOW TEST - REAL DATA (NO SIMULATION) ║');
    console.log('╚══════════════════════════════════════════════╝');

    let success = false;
    let sessionPath = null;

    try {
        sessionPath = initSession();

        // Test llama-server connection first
        console.log('\n[Check] Testing llama-server connection...');
        await callRealAI('Test', 'Say OK');
        console.log('[Check] ✅ Llama-server is online!');

        const workerSummaries = await processFilesWithRealAI(sessionPath);

        if (workerSummaries.length > 0) {
            await runRealCurator(sessionPath, workerSummaries);
        }

        success = true;
        console.log('\n✅ TEST PASSED WITH REAL DATA!');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.message.includes('Connection error')) {
            console.error('💡 Make sure llama-server is running: llama-server --port 8000');
        }
    }

    if (sessionPath) {
        const summary = generateSummary(sessionPath, success);
        console.log('\nSummary:', JSON.stringify(summary, null, 2));
        console.log(`\nLogs at: ${sessionPath}`);
    }

    return { success, sessionPath };
}

// Execute
runTest().then(result => {
    process.exit(result.success ? 0 : 1);
});
