/**
 * CodeScanner - Deep code scanning of repositories
 * Extracted from ProfileAnalyzer to comply with SRP
 * UPDATED: Uses centralized Logger and CacheRepository
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';

// Configuration constants
const MAX_ANCHORS_PER_REPO = 50;
const MAX_WORKER_QUEUE_SIZE = 200;
const MAX_CODE_SNIPPET_LENGTH = 1500;

/**
 * Deep Code Scanning Engine with Cache (Recursive)
 * - Analyzes ALL repos (not just 5)
 * - Uses cache to avoid re-downloads
 * - Processes more files per repo (10 instead of 3)
 */
export class CodeScanner {
    constructor(coordinator, workerPool) {
        this.coordinator = coordinator;
        this.workerPool = workerPool;
    }

    /**
     * Scans all user repositories
     * @param {string} username 
     * @param {Array} repos 
     * @param {Function} onStep 
     * @returns {Promise<Array>} Curated findings
     */
    async scan(username, repos, onStep = null) {
        // Initialize coordinator with all repos
        this.coordinator.initInventory(repos);
        this.coordinator.onProgress = (data) => {
            if (onStep) onStep(data);
        };

        const targetRepos = repos;
        const allFindings = [];

        // Process in parallel batches
        await Promise.all(targetRepos.map(async (repo, index) => {
            if (onStep) {
                const stats = this.coordinator.getStats();
                onStep({ type: 'Progreso', percent: stats.progress, message: `Scanning ${repo.name}...` });
            }

            try {
                const { treeFiles, treeSha } = await this.getRepoTree(username, repo, onStep, allFindings);
                if (!treeFiles || treeFiles.length === 0) return;

                // Register files in coordinator
                this.coordinator.registerRepoFiles(repo.name, treeFiles, treeSha);

                // Check if repo changed since last time (cache)
                const needsFullScan = await CacheRepository.hasRepoChanged(username, repo.name, treeSha);
                if (!needsFullScan) {
                    Logger.cache(`${repo.name} - Using cached data`, true);
                }

                // Identify "Anchor" files (Architecture)
                const anchors = this.identifyAnchorFiles(treeFiles);

                // Audit anchor files (max 50 per repo)
                const repoAudit = await this.auditFiles(username, repo.name, anchors.slice(0, MAX_ANCHORS_PER_REPO), needsFullScan, onStep);

                // Save tree SHA in cache
                await CacheRepository.setRepoTreeSha(username, repo.name, treeSha);

                allFindings.push({
                    repo: repo.name,
                    techStack: anchors.map(a => a.path),
                    auditedFiles: repoAudit.filter(f => f !== null)
                });

                if (onStep) {
                    const stats = this.coordinator.getStats();
                    onStep({ type: 'Progreso', percent: stats.progress, message: `Completado ${repo.name}.` });
                }

            } catch (e) {
                Logger.error('SCAN', `Error escaneando ${repo.name}: ${e.message}`);
                this.coordinator.report('Error', `${repo.name}: ${e.message}`);
            }
        }));

        // Log estadísticas del coordinator
        const stats = this.coordinator.getStats();
        Logger.progress(stats.analyzed, stats.totalFiles, 'archivos descargados');

        return allFindings;
    }

    /**
     * Gets the file tree of a repo (own or fork)
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
     * Audits a list of files, downloading content and saving to cache
     */
    async auditFiles(username, repoName, files, needsFullScan, onStep) {
        return await Promise.all(files.map(async (file) => {
            // Check cache first
            if (!needsFullScan) {
                const needsUpdate = await CacheRepository.needsUpdate(username, repoName, file.path, file.sha);
                if (!needsUpdate) {
                    const cached = await CacheRepository.getFileSummary(username, repoName, file.path);
                    if (cached) {
                        this.coordinator.markCompleted(repoName, file.path, cached.summary);
                        return { path: file.path, snippet: cached.contentSnippet || '', fromCache: true };
                    }
                }
            }

            if (onStep) {
                const stats = this.coordinator.getStats();
                onStep({ type: 'Progreso', percent: stats.progress, message: `Downloading ${file.path}...` });
            }

            const contentRes = await window.githubAPI.getFileContent(username, repoName, file.path);
            if (contentRes && contentRes.content) {
                const codeSnippet = atob(contentRes.content.replace(/\n/g, '')).substring(0, MAX_CODE_SNIPPET_LENGTH);

                // Save to cache
                await CacheRepository.setFileSummary(
                    username, repoName, file.path,
                    contentRes.sha,
                    codeSnippet.substring(0, 500),
                    codeSnippet
                );

                // Enqueue for AI processing
                if (this.workerPool.totalQueued < MAX_WORKER_QUEUE_SIZE) {
                    this.workerPool.enqueue(repoName, file.path, codeSnippet, contentRes.sha);
                }

                this.coordinator.markCompleted(repoName, file.path, codeSnippet.substring(0, 100));
                return { path: file.path, snippet: codeSnippet };
            }
            return null;
        }));
    }

    /**
     * Identifies relevant "anchor" files for analysis
     */
    identifyAnchorFiles(tree) {
        const extensions = [
            '.json', '.cpp', '.hpp', '.c', '.h', '.js', '.py', '.java', '.rs', '.go',
            '.rb', '.php', '.cs', '.ts', '.tsx', '.vue', '.svelte', '.sh', '.md', '.yml', '.yaml'
        ];
        const specificFiles = [
            'Dockerfile', 'Makefile', 'CMakeLists.txt', 'requirements.txt', 'package.json', 'go.mod'
        ];

        return tree.filter(node => {
            if (node.type !== 'blob') return false;
            const lowerPath = node.path.toLowerCase();
            const hasExt = extensions.some(ext => lowerPath.endsWith(ext));
            const isSpecific = specificFiles.some(file => lowerPath.endsWith(file.toLowerCase()));
            return hasExt || isSpecific;
        });
    }

    /**
     * Curates findings for the main AI
     */
    curateFindings(findings) {
        if (findings.length === 0) return [];

        return findings.map(f => ({
            repo: f.repo,
            error: f.error || null,
            structure: f.techStack ? (f.techStack.length > 0 ? f.techStack.slice(0, 10).join(', ') : "Structure not accessible") : "N/A",
            auditedSnippets: f.auditedFiles ? (f.auditedFiles.length > 0 ? f.auditedFiles.map(af => ({
                file: af.path,
                content: af.snippet?.substring(0, 300) || '',
                aiSummary: af.aiSummary || null
            })) : "No Access") : "Read Error"
        }));
    }
}
