import path from 'path';
import fs from 'node:fs';

/**
 * DiskMirrorService - Logic for writing human-readable JSON files and SUMMARY.json.
 */
class DiskMirrorService {
    constructor(baseMirrorPath) {
        this.baseMirrorPath = baseMirrorPath;
        this.currentMirrorPath = baseMirrorPath;

        // Ensure base directory exists
        if (!fs.existsSync(this.baseMirrorPath)) {
            fs.mkdirSync(this.baseMirrorPath, { recursive: true });
        }
    }

    /**
     * Switches the current mirror path (used for session switching).
     * @param {string} newPath
     */
    setMirrorPath(newPath) {
        this.currentMirrorPath = newPath;

        // Ensure directory exists
        if (!fs.existsSync(this.currentMirrorPath)) {
            fs.mkdirSync(this.currentMirrorPath, { recursive: true });
        }
    }

    /**
     * Mirrors data to a readable JSON file.
     * @param {string} subfolder
     * @param {string} filename
     * @param {Object|Array} data
     * @param {boolean} append - If true, appends as JSONL instead of overwriting
     */
    async mirrorToDisk(subfolder, filename, data, append = false) {
        try {
            const baseDir = this.currentMirrorPath;
            const dir = path.join(baseDir, subfolder);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const filePath = path.join(dir, filename);

            if (append) {
                fs.appendFileSync(filePath, JSON.stringify(data) + '\n');
            } else {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            }
        } catch (error) {
            console.error(`[DiskMirrorService] Mirror failed: ${error.message}`);
        }
    }

    /**
     * Generates and saves a run summary.
     * @param {Object} stats
     * @param {string} sessionId
     * @returns {Object} The generated summary
     */
    async generateRunSummary(stats, sessionId = null) {
        const summary = {
            id: sessionId || `TRACE_${Date.now()}`,
            timestamp: new Date().toISOString(),
            stats: stats,
            performance: stats.performance || {},
            reposAnalyzed: stats.reposAnalyzed || [],
            coverage: {
                totalFiles: stats.totalFiles || 0,
                analyzed: stats.analyzed || 0,
                percent: stats.progress || 0
            }
        };

        await this.mirrorToDisk('', 'SUMMARY.json', summary);
        return summary;
    }

    /**
     * Mirrors raw findings for a repository.
     * @param {string} repoName
     * @param {Object} finding
     */
    async mirrorRepoRawFinding(repoName, finding) {
        await this.mirrorToDisk(path.join('repos', repoName), 'raw_findings.jsonl', finding, true);
    }

    /**
     * Mirrors curated memory for a repository.
     * @param {string} repoName
     * @param {Array} nodes
     */
    async mirrorRepoCuratedMemory(repoName, nodes) {
        await this.mirrorToDisk(path.join('repos', repoName), 'curated_memory.json', nodes);
    }

    /**
     * Mirrors blueprint for a repository.
     * @param {string} repoName
     * @param {Object} blueprint
     */
    async mirrorRepoBlueprint(repoName, blueprint) {
        await this.mirrorToDisk(path.join('repos', repoName), 'blueprint.json', blueprint);
    }

    /**
     * Gets the current mirror path.
     * @returns {string}
     */
    getCurrentMirrorPath() {
        return this.currentMirrorPath;
    }

    /**
     * Resets mirror path to base path.
     */
    resetToBasePath() {
        this.currentMirrorPath = this.baseMirrorPath;
    }
}

export { DiskMirrorService };
