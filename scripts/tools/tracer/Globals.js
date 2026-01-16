import path from 'path';
import fs from 'fs';
import { ROOT, SESSION_PATH } from './TracerContext.js';
import { GithubMock } from './GithubMock.js';
import { PersistenceMock } from './PersistenceMock.js';

/**
 * Globals - Browser Environment Simulation for Node
 * 
 * Responsabilidad: Inyectar window, document y las sub-APIs (githubAPI, etc.)
 * en el scope global de Node para que los servicios del renderer funcionen.
 */

export class Globals {
    static inject(authToken) {
        global.window = {
            githubAPI: GithubMock.createAPI(authToken),
            cacheAPI: PersistenceMock.createAPI(),
            utilsAPI: { checkAIHealth: async () => true },
            debugAPI: {
                createSession: async (id) => ({ success: true, path: path.join(ROOT, 'logs/sessions', id) }),
                appendLog: async (sessionId, subfolder, filename, content) => {
                    const filePath = path.join(ROOT, 'logs/sessions', sessionId, subfolder, filename);
                    const dir = path.dirname(filePath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    try {
                        fs.appendFileSync(filePath, content);
                    } catch (e) { }
                    return { success: true };
                }
            },
            AI_CONFIG: {
                endpoint: 'http://127.0.0.1:8000/v1/chat/completions',
                embeddingEndpoint: 'http://127.0.0.1:8001/v1/embeddings'
            },
            AI_OFFLINE: false
        };

        global.document = {
            querySelector: () => null,
            getElementById: (id) => ({
                value: '',
                innerText: '',
                classList: { add: () => { }, remove: () => { } },
                addEventListener: () => { },
                dataset: {},
                style: {},
                dispatchEvent: () => { },
                appendChild: () => { }
            }),
            createElement: (tag) => ({
                className: '',
                style: {},
                classList: { add: () => { } },
                appendChild: () => { },
                innerText: ''
            })
        };
        global.Element = class { };

        // Polyfill fetch if not present (Node 18+ has it)
        if (!global.fetch) {
            import('node-fetch').then(f => global.fetch = f.default);
        }
    }
}
