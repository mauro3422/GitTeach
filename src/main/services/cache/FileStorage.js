import fs from 'fs';
import path from 'path';

/**
 * FileStorage - Base persistence layer for JSON and JSONL files
 */
export class FileStorage {
    static loadJson(filePath, defaultValue) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) {
            console.error(`[FileStorage] Error loading ${path.basename(filePath)}:`, e);
        }
        return defaultValue;
    }

    static saveJson(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (e) {
            console.error(`[FileStorage] Error saving ${path.basename(filePath)}:`, e);
            return false;
        }
    }

    static appendLine(filePath, line) {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(filePath, line + '\n', 'utf8');
            return true;
        } catch (e) {
            console.error(`[FileStorage] Error appending to ${path.basename(filePath)}:`, e);
            return false;
        }
    }

    static readLines(filePath) {
        if (!fs.existsSync(filePath)) return [];
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return content.trim().split('\n').filter(l => l.trim()).map(line => JSON.parse(line));
        } catch (e) {
            console.error(`[FileStorage] Error reading lines from ${path.basename(filePath)}:`, e);
            return [];
        }
    }

    static deleteFile(filePath) {
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                return true;
            } catch (e) {
                return false;
            }
        }
        return true;
    }
}
