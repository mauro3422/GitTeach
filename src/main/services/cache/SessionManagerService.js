import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { LevelDBManager } from '../db/LevelDBManager.js';
import AppLogger from '../system/AppLogger.js';

/**
 * SessionManagerService - Handles session lifecycle management
 */
export class SessionManagerService {
    constructor() {
        this.sessionDb = null;
        this.currentSessionId = null;
        this.sessionCacheManager = null;
        this.baseSessionPath = path.join(process.cwd(), 'logs', 'sessions');
    }

    /**
     * Switches the active session for Results isolation
     */
    async switchSession(sessionId) {
        if (!sessionId) {
            // Revert results to global
            if (!this.sessionDb) return;
            AppLogger.info('SessionManagerService', 'Switching results back to Global DB');
            await this.sessionDb.close();
            this.sessionDb = null;
            this.sessionCacheManager = null;
            this.currentSessionId = null;
            return;
        }

        // Create a session-specific path inside logs/sessions
        const sessionPath = path.join(this.baseSessionPath, sessionId);
        const sessionDbPath = path.join(sessionPath, 'db');
        if (!fs.existsSync(sessionDbPath)) {
            fs.mkdirSync(sessionDbPath, { recursive: true });
        }

        console.log(`[SessionManagerService] Switching results to Session: ${sessionId}`);
        if (this.sessionDb) await this.sessionDb.close();

        this.sessionDb = new LevelDBManager(sessionDbPath);
        await this.sessionDb.open();

        // Import SessionCacheManager here to avoid circular dependencies
        const { SessionCacheManager } = await import('./SessionCacheManager.js');
        this.sessionCacheManager = new SessionCacheManager(this.sessionDb);
        this.currentSessionId = sessionId;
    }

    /**
     * Gets the current session ID
     */
    getCurrentSessionId() {
        return this.currentSessionId;
    }

    /**
     * Gets the current session path
     */
    getSessionPath() {
        if (!this.currentSessionId) {
            return null;
        }
        return path.join(this.baseSessionPath, this.currentSessionId);
    }

    /**
     * Checks if there's an active session
     */
    isActiveSession() {
        return !!this.sessionDb;
    }

    /**
     * Gets the session database instance
     */
    getSessionDb() {
        return this.sessionDb;
    }

    /**
     * Gets the session cache manager instance
     */
    getSessionCacheManager() {
        return this.sessionCacheManager;
    }
}