import fs from 'fs';
import path from 'path';
import { ROOT, SESSION_PATH } from './TracerContext.js';

/**
 * AILogCopier - Copies AI server logs to session folder
 * 
 * Call captureStartPositions() at session start to mark log positions.
 * Call copyLogsToSession() at session end to copy session-relevant logs.
 */

const LOG_FILES = [
    { name: 'ai_brain_gpu.log', source: path.join(ROOT, 'logs', 'ai_brain_gpu.log') },
    { name: 'ai_mapper_cpu.log', source: path.join(ROOT, 'logs', 'ai_mapper_cpu.log') },
    { name: 'ai_vectors_cpu.log', source: path.join(ROOT, 'logs', 'ai_vectors_cpu.log') }
];

class AILogCopier {
    constructor() {
        this.startPositions = {};
    }

    /**
     * Mark current positions of all log files at session start.
     * This allows us to only copy the portion written during this session.
     */
    captureStartPositions() {
        for (const logFile of LOG_FILES) {
            try {
                if (fs.existsSync(logFile.source)) {
                    const stats = fs.statSync(logFile.source);
                    this.startPositions[logFile.name] = stats.size;
                    console.log(`📁 Log position captured: ${logFile.name} @ ${stats.size} bytes`);
                } else {
                    this.startPositions[logFile.name] = 0;
                }
            } catch (e) {
                this.startPositions[logFile.name] = 0;
            }
        }
    }

    /**
     * Copy the session-relevant portion of logs to the session folder.
     * Only copies content written AFTER captureStartPositions() was called.
     */
    copyLogsToSession() {
        const aiLogsDir = path.join(SESSION_PATH, 'ai_logs');

        try {
            if (!fs.existsSync(aiLogsDir)) {
                fs.mkdirSync(aiLogsDir, { recursive: true });
            }

            for (const logFile of LOG_FILES) {
                try {
                    if (!fs.existsSync(logFile.source)) {
                        console.log(`⚠️ Log not found: ${logFile.name}`);
                        continue;
                    }

                    const startPos = this.startPositions[logFile.name] || 0;
                    const currentSize = fs.statSync(logFile.source).size;
                    const bytesToCopy = currentSize - startPos;

                    if (bytesToCopy <= 0) {
                        console.log(`📄 No new content in: ${logFile.name}`);
                        continue;
                    }

                    // Read only the new portion of the log
                    const fd = fs.openSync(logFile.source, 'r');
                    const buffer = Buffer.alloc(bytesToCopy);
                    fs.readSync(fd, buffer, 0, bytesToCopy, startPos);
                    fs.closeSync(fd);

                    // Write to session folder
                    const destPath = path.join(aiLogsDir, logFile.name);
                    fs.writeFileSync(destPath, buffer);

                    console.log(`✅ Copied ${logFile.name}: ${bytesToCopy} bytes (session-only)`);
                } catch (e) {
                    console.warn(`⚠️ Failed to copy ${logFile.name}: ${e.message}`);
                }
            }

            console.log(`📂 AI logs saved to: ${aiLogsDir}`);
        } catch (e) {
            console.error(`❌ AILogCopier error: ${e.message}`);
        }
    }
}

export const aiLogCopier = new AILogCopier();
