
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DebugLogger } from './src/renderer/js/utils/debugLogger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_ID = 'SANITY_CHECK_' + Date.now();
const LOG_DIR = path.join(__dirname, 'logs', 'sessions', SESSION_ID);

console.log('--- SANITY CHECK ---');

// 1. Configure Logger
DebugLogger.enabled = true;
DebugLogger.sessionPath = LOG_DIR;
DebugLogger.sessionId = SESSION_ID;
DebugLogger.fs = fs;
DebugLogger.path = path;
DebugLogger.isNode = true;

console.log('Logger Configured. Path:', LOG_DIR);

// 2. Ensure Dir
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// 3. Test Direct Write
try {
    DebugLogger.logWorker(1, { message: "Test log" });
    console.log('Log call made.');
} catch (e) {
    console.error('Log call failed:', e);
}

// 4. Verify File
const expectedFile = path.join(LOG_DIR, 'workers', 'worker_1.jsonl');
setTimeout(() => {
    if (fs.existsSync(expectedFile)) {
        console.log('✅ FAILURE EXCLUDED: Logger works. File exists:', expectedFile);
        console.log('Content:', fs.readFileSync(expectedFile, 'utf8'));
    } else {
        console.error('❌ FATAL: File does not exist:', expectedFile);

        // Debug: why?
        console.log('Checking internal state...');
        // DebugLogger internal state check would be nice, but accessing private fields is hard.
    }
}, 1000);
