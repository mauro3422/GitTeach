/**
 * RepoTreeFetcher - Handles repository tree fetching and processing
 * Extracted from CodeScanner to comply with SRP
 *
 * Responsibilities:
 * - Fetch repository trees from GitHub API
 * - Handle fork repositories and contribution analysis
 * - Process rate limiting and error handling
 * - Extract file trees from commits and diffs
 */
import { Logger } from '../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

export class RepoTreeFetcher {
    /**
     * Gets the file tree of a repo (own or fork)
     * @param {string} username - GitHub username
     * @param {Object} repo - Repository object
     * @param {Function} onStep - Progress callback
     * @param {Array} allFindings - Findings array for error reporting
     * @returns {Promise<Object>} { treeFiles, treeSha }
     */
    async getRepoTree(username, repo, onStep, allFindings) {
        let treeFiles = [];
        let treeSha = 'unknown';

        if (repo.fork) {
            // If fork, only analyze IF user contributed
            Logger.fork(`Investigating contributions in ${repo.name}...`);

            const userCommits = await window.githubAPI.getUserCommits(username, repo.name, username);

            if (!userCommits || userCommits.length === 0) {
                Logger.info('FORK IGNORED', `No contributions in ${repo.name}. Skipping.`);
                return { treeFiles: [], treeSha: null };
            }

            // Extract modified files from commits
            const uniqueFiles = new Set();
            for (const commit of userCommits) {
                const diff = await window.githubAPI.getCommitDiff(username, repo.name, commit.sha);
                if (diff && diff.files) {
                    diff.files.forEach(f => {
                        if (!uniqueFiles.has(f.filename)) {
                            uniqueFiles.add(f.filename);
                            treeFiles.push({ path: f.filename, type: 'blob', sha: f.sha, mode: 'patch' });
                        }
                    });
                }
            }
            treeSha = `patch_group_${userCommits[0].sha}`;

            Logger.fork(`${treeFiles.length} modified files found in ${repo.name}.`, true);

        } else {
            // Own repository: Full analysis
            const treeData = await window.githubAPI.getRepoTree(username, repo.name, true);

            try {
                const logPath = path.join(process.cwd(), 'debug_tree.log');
                const logMsg = `[RepoTreeFetcher] Repo: ${repo.name}. TreeData: ${JSON.stringify(treeData?.tree?.length || "ND")}. Msg: ${treeData?.message || "OK"}\n`;
                fs.appendFileSync(logPath, logMsg);
            } catch (e) { }

            if (treeData && treeData.message && treeData.message.includes("rate limit")) {
                onStep({ type: 'Error', message: `Database temporarily blocked (Rate Limit).` });
                allFindings.push({ repo: repo.name, error: "Rate Limit" });
                return { treeFiles: [], treeSha: null };
            }

            if (!treeData || !treeData.tree) return { treeFiles: [], treeSha: null };
            treeFiles = treeData.tree;
            treeSha = treeData.sha || 'unknown';
        }

        return { treeFiles, treeSha };
    }

    /**
     * Checks if repository tree fetching is rate limited
     * @param {Object} treeData - Response from GitHub API
     * @returns {boolean} True if rate limited
     */
    isRateLimited(treeData) {
        return treeData && treeData.message && treeData.message.includes("rate limit");
    }

    /**
     * Validates repository tree data
     * @param {Object} treeData - Tree data from GitHub
     * @returns {boolean} True if valid
     */
    isValidTreeData(treeData) {
        return treeData && treeData.tree && Array.isArray(treeData.tree);
    }

    /**
     * Extracts unique files from commit diffs
     * @param {Array} userCommits - User commits array
     * @param {string} repoName - Repository name
     * @returns {Array} Unique file objects
     */
    async extractFilesFromCommits(userCommits, repoName) {
        const uniqueFiles = new Set();
        const treeFiles = [];

        for (const commit of userCommits) {
            const diff = await window.githubAPI.getCommitDiff(null, repoName, commit.sha);
            if (diff && diff.files) {
                diff.files.forEach(f => {
                    if (!uniqueFiles.has(f.filename)) {
                        uniqueFiles.add(f.filename);
                        treeFiles.push({
                            path: f.filename,
                            type: 'blob',
                            sha: f.sha,
                            mode: 'patch'
                        });
                    }
                });
            }
        }

        return treeFiles;
    }

    /**
     * Generates tree SHA for patch groups
     * @param {Array} userCommits - User commits
     * @returns {string} Generated SHA
     */
    generatePatchGroupSha(userCommits) {
        return userCommits && userCommits.length > 0
            ? `patch_group_${userCommits[0].sha}`
            : 'unknown';
    }
}
