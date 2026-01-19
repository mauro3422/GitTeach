// src/main/handlers/debugHandler.js
// Handler: IPC bridge for debug logging (AI flow analysis)

import path from 'node:path';
import fs from 'fs';
import { app } from 'electron';

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

    // --- Create Debug Session ---
    ipcMain.handle('debug:create-session', async (event, sessionId) => {
        try {
            const sessionPath = path.join(DEBUG_BASE_DIR, `SESSION_${sessionId}`);

            // Create folder structure
            ensureDir(path.join(sessionPath, 'workers'));
            ensureDir(path.join(sessionPath, 'curator'));
            ensureDir(path.join(sessionPath, 'chat'));
            ensureDir(path.join(sessionPath, 'memory'));

            console.log(`[DebugHandler] ✅ Session created: ${sessionPath}`);
            return { success: true, path: sessionPath };
        } catch (error) {
            console.error('[DebugHandler] Error creating session:', error);
            return { success: false, error: error.message };
        }
    });

    // --- Append to Debug Log ---
    ipcMain.handle('debug:append-log', async (event, { sessionId, folder, filename, content }) => {
        try {
            const filePath = path.join(DEBUG_BASE_DIR, `SESSION_${sessionId}`, folder, filename);

            // Ensure parent directory exists
            ensureDir(path.dirname(filePath));

            // Append content (or create if doesn't exist)
            fs.appendFileSync(filePath, content, 'utf-8');

            return { success: true };
        } catch (error) {
            console.error('[DebugHandler] Error appending log:', error);
            return { success: false, error: error.message };
        }
    });

    // --- Get Session Path ---
    ipcMain.handle('debug:get-sessions-path', async () => {
        return { success: true, path: DEBUG_BASE_DIR };
    });

    // --- List Sessions ---
    ipcMain.handle('debug:list-sessions', async () => {
        try {
            ensureDir(DEBUG_BASE_DIR);
            const sessions = fs.readdirSync(DEBUG_BASE_DIR)
                .filter(f => f.startsWith('SESSION_'))
                .map(name => ({
                    name,
                    path: path.join(DEBUG_BASE_DIR, name),
                    created: fs.statSync(path.join(DEBUG_BASE_DIR, name)).birthtime
                }));
            return { success: true, sessions };
        } catch (error) {
            return { success: false, error: error.message, sessions: [] };
        }
    });

    console.log('[Handlers] ✅ debugHandler registered.');
}

export default { register };
