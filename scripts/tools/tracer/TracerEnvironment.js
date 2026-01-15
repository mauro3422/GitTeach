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
