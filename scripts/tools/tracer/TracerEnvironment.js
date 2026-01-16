import fs from 'fs';
import { PID_FILE, SESSION_PATH, MOCK_PERSISTENCE_PATH } from './TracerContext.js';

/**
 * TracerEnvironment - Process and Filesystem management
 * 
 * Responsabilidad: Highlander Protocol (PIDs), creación de carpetas
 * y manejo de eventos de salida del proceso.
 */

export class TracerEnvironment {
    static ensureDir(dir) {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    static setupHighlanderProtocol() {
        try {
            if (fs.existsSync(PID_FILE)) {
                const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
                try {
                    process.kill(oldPid, 'SIGKILL');
                } catch (e) {
                    // Process already dead
                }
            }
        } catch (e) { }

        if (typeof global.window === 'undefined') {
            global.window = {
                AI_CONFIG: {
                    endpoint: 'http://localhost:8000/v1/chat/completions',
                    embeddingEndpoint: 'http://localhost:8001/v1/embeddings'
                },
                cacheAPI: {
                    getTechnicalIdentity: async () => ({ bio: 'MOCK BIO', traits: [] }),
                    getCognitiveProfile: async () => ({ learningStyle: 'Visual' }),
                    getStats: async () => ({ fileCount: 50, repoCount: 3 }),
                    getDeveloperDNA: async () => ({ bio: 'MOCK DNA', traits: [] })
                },
                utilsAPI: {
                    checkAIHealth: async () => true
                },
                githubAPI: {
                    onAIStatusChange: () => { }
                }
            };

            // Minimal DOM Mock for ChatComponent/AIToolbox compatibility
            global.document = {
                getElementById: (id) => ({
                    value: '',
                    innerText: '',
                    classList: { add: () => { }, remove: () => { } },
                    addEventListener: () => { },
                    dataset: {},
                    style: {},
                    dispatchEvent: () => { }
                }),
                createElement: (tag) => ({
                    className: '',
                    style: {},
                    classList: { add: () => { } },
                    appendChild: () => { }
                })
            };
            global.Element = class { }; // Polyfill Element class check

            // Ensure Fetch is available (Node 18+ has it, but just in case)
            if (!global.fetch) {
                try {
                    // Dynamic import hack for ESM modules in CJS context if needed, 
                    // or just rely on the fact we are in Node 22.
                    // If native fetch is failing, it might be an Agent/Undici issue with localhost.
                    // We will try to patch the URL.
                } catch (e) { }
            }

            // Patch AI_CONFIG to use 127.0.0.1 to avoid Node 17+ localhost resolution issues
            global.window.AI_CONFIG.endpoint = global.window.AI_CONFIG.endpoint.replace('localhost', '127.0.0.1');
            global.window.AI_CONFIG.embeddingEndpoint = global.window.AI_CONFIG.embeddingEndpoint.replace('localhost', '127.0.0.1');
        }

        fs.writeFileSync(PID_FILE, process.pid.toString());

        // Cleanup on exit
        process.on('exit', () => { try { fs.unlinkSync(PID_FILE); } catch (e) { } });
        process.on('SIGINT', () => { process.exit(); });
    }

    static initializeSessionFolders() {
        this.ensureDir(SESSION_PATH);
        this.ensureDir(path.join(SESSION_PATH, 'workers'));
        this.ensureDir(path.join(SESSION_PATH, 'curator'));
        this.ensureDir(path.join(SESSION_PATH, 'chat'));
        this.ensureDir(MOCK_PERSISTENCE_PATH);

        // Import path from node for internal use
        // (already used in TracerContext but good to be explicit if needed here)
    }
}

// Internal helper for full paths inside sessions
import path from 'path';
