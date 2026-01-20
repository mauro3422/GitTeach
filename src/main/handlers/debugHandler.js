// src/main/handlers/debugHandler.js
import path from 'node:path';
import fs from 'fs';
import { IpcWrapper } from './IpcWrapper.js';

// Debug sessions base directory
const DEBUG_BASE_DIR = path.join(process.cwd(), 'logs', 'sessions');
if (!fs.existsSync(DEBUG_BASE_DIR)) {
    fs.mkdirSync(DEBUG_BASE_DIR, { recursive: true });
}

/**
 * Ensure directory exists, create recursively if needed
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Registers all debug-related IPC handlers.
 * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
 */
export function register(ipcMain) {
    IpcWrapper.registerHandler(
        ipcMain,
        'debug:create-session',
        async (event, sessionId) => {
            const sessionPath = path.join(DEBUG_BASE_DIR, `SESSION_${sessionId}`);
            ensureDir(path.join(sessionPath, 'workers'));
            ensureDir(path.join(sessionPath, 'curator'));
            ensureDir(path.join(sessionPath, 'chat'));
            ensureDir(path.join(sessionPath, 'memory'));
            return { success: true, path: sessionPath };
        },
        'debug:create-session'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'debug:append-log',
        async (event, { sessionId, folder, filename, content }) => {
            const filePath = path.join(DEBUG_BASE_DIR, `SESSION_${sessionId}`, folder, filename);
            ensureDir(path.dirname(filePath));
            fs.appendFileSync(filePath, content, 'utf-8');
            return { success: true };
        },
        'debug:append-log'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'debug:get-sessions-path',
        () => ({ success: true, path: DEBUG_BASE_DIR }),
        'debug:get-sessions-path'
    );

    IpcWrapper.registerHandler(
        ipcMain,
        'debug:list-sessions',
        async () => {
            ensureDir(DEBUG_BASE_DIR);
            const sessions = fs.readdirSync(DEBUG_BASE_DIR)
                .filter(f => f.startsWith('SESSION_'))
                .map(name => ({
                    name,
                    path: path.join(DEBUG_BASE_DIR, name),
                    created: fs.statSync(path.join(DEBUG_BASE_DIR, name)).birthtime
                }));
            return { success: true, sessions };
        },
        'debug:list-sessions'
    );

    console.log('[Handlers] ✅ debugHandler registered with IpcWrapper.');
}

export default { register };
