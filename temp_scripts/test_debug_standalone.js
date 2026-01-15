/**
 * Standalone Debug Flow Test (Node.js)
 * Simulates the AI worker flow and writes debug logs to disk
 * 
 * Run: node test_debug_standalone.js
 */

const fs = require('fs');
const path = require('path');

// Config
const DEBUG_DIR = path.join(__dirname, 'DEBUG_SESSION_TEST');
const SESSION_ID = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure directory structure
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Initialize session
function initSession() {
    console.log('=== INITIALIZING DEBUG SESSION ===');
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
    console.log(`[Chat ${type}] Logged: ${message.substring(0, 50)}...`);
}

// Simulate worker processing
function simulateWorkers(sessionPath) {
    console.log('\n=== SIMULATING WORKERS ===');

    // Simulate 4 workers processing files
    const files = [
        { repo: 'GitTeach', path: 'src/main/index.js', content: 'Electron main process entry...' },
        { repo: 'GitTeach', path: 'src/renderer/js/services/aiService.js', content: 'AI service with callAI method...' },
        { repo: 'GitTeach', path: 'src/renderer/js/services/deepCurator.js', content: 'Map-reduce curator...' },
        { repo: 'GitTeach', path: 'src/renderer/js/components/chatComponent.js', content: 'Chat UI component...' }
    ];

    const summaries = [];
    files.forEach((file, index) => {
        const workerId = (index % 4) + 1;
        const summary = `[SIMULATED] ${file.path}: Business logic, clean architecture, SOLID patterns detected.`;

        logWorker(sessionPath, workerId, {
            input: { repo: file.repo, path: file.path, contentLength: file.content.length },
            prompt: `Analyze ${file.path} for developer strengths...`,
            output: summary
        });

        summaries.push({ file: file.path, summary });
    });

    return summaries;
}

// Simulate curator processing
function simulateCurator(sessionPath, workerSummaries) {
    console.log('\n=== SIMULATING CURATOR ===');

    // Mapper phase
    const mapperOutput = {
        architecture: 'Modular design, SRP compliance, Factory pattern in services',
        habits: 'Consistent naming (camelCase), JSDoc comments, error handling',
        stack: 'Electron, Node.js, JavaScript ES6+, IPC communication'
    };
    logCurator(sessionPath, 'mapper_output', mapperOutput);

    // Reducer phase
    const reducerOutput = {
        bio: 'Full-stack developer specializing in Electron desktop apps with strong architecture skills.',
        traits: [
            { name: 'Architecture', score: 82, details: 'Clean modular structure with SRP' },
            { name: 'Habits', score: 75, details: 'Good naming, some missing docs' },
            { name: 'Technology', score: 88, details: 'Advanced Electron/Node.js usage' }
        ],
        verdict: 'Mid-Senior Desktop Developer',
        workerSummariesReceived: workerSummaries.length
    };
    logCurator(sessionPath, 'reducer_output', reducerOutput);

    return reducerOutput;
}

// Simulate chat interaction
function simulateChat(sessionPath, dna) {
    console.log('\n=== SIMULATING CHAT ===');

    logChat(sessionPath, 'user', 'Analiza mi perfil de GitHub y dime qué mejorar');
    logChat(sessionPath, 'ai', `He analizado tu perfil. ${dna.bio} Tu veredicto es: ${dna.verdict}. Puntuación de arquitectura: ${dna.traits[0].score}/100.`);
}

// Generate summary
function generateSummary(sessionPath) {
    console.log('\n=== GENERATING SUMMARY ===');

    const summary = {
        sessionId: SESSION_ID,
        sessionPath,
        endTime: new Date().toISOString(),
        filesGenerated: {
            workers: fs.readdirSync(path.join(sessionPath, 'workers')),
            curator: fs.readdirSync(path.join(sessionPath, 'curator')),
            chat: fs.readdirSync(path.join(sessionPath, 'chat'))
        }
    };

    const summaryPath = path.join(sessionPath, 'SUMMARY.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('Summary:', JSON.stringify(summary, null, 2));
    return summary;
}

// Main test execution
function runTest() {
    console.log('╔══════════════════════════════════════╗');
    console.log('║  DEBUG FLOW STANDALONE TEST          ║');
    console.log('╚══════════════════════════════════════╝');

    try {
        const sessionPath = initSession();
        const workerSummaries = simulateWorkers(sessionPath);
        const dna = simulateCurator(sessionPath, workerSummaries);
        simulateChat(sessionPath, dna);
        const summary = generateSummary(sessionPath);

        console.log('\n✅ TEST PASSED!');
        console.log(`Check logs at: ${sessionPath}`);

        return { success: true, sessionPath, summary };
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        return { success: false, error: error.message };
    }
}

// Execute
const result = runTest();
process.exit(result.success ? 0 : 1);
