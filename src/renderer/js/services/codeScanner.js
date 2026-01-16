/**
 * CodeScanner - Deep code scanning of repositories
 * Extracted from ProfileAnalyzer to comply with SRP
 * UPDATED: Uses centralized Logger and CacheRepository
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { DebugLogger } from '../utils/debugLogger.js';

// Configuration constants
// Configuration constants (Defaults)
const DEFAULT_MAX_ANCHORS = 10;
const DEFAULT_MAX_REPOS = 10;
const MAX_WORKER_QUEUE_SIZE = 50000;
const MAX_CODE_SNIPPET_LENGTH = 3000;

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
    async scan(username, repos, onStep = null, options = {}) {
        const maxRepos = options.maxRepos || (window.IS_TRACER ? DEFAULT_MAX_REPOS : 50000);
        const maxAnchors = options.maxAnchors || (window.IS_TRACER ? DEFAULT_MAX_ANCHORS : 50000);

        // Sort by updated date (descending) and slice for 10x10 logic
        const targetRepos = [...repos].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, maxRepos);

        // Initialize coordinator with target repos
        this.coordinator.initInventory(targetRepos);
        this.coordinator.onProgress = (data) => {
            if (onStep) onStep(data);
        };

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

                // Audit anchor files (Limited according to mode)
                const repoAudit = await this.auditFiles(username, repo.name, anchors.slice(0, maxAnchors), needsFullScan, onStep);

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
            // Check cache first - SHA verification is now ALWAYS active (Cache-First)
            const needsUpdate = await CacheRepository.needsUpdate(username, repoName, file.path, file.sha);

            // 1. Check if we have a valid AI Snippet in cache (Offline Mode)
            if (!needsUpdate) {
                const cached = await CacheRepository.getFileSummary(username, repoName, file.path);

                // OFFLINE HIT: If we have the FULL AI context (3000 chars), use it!
                if (cached && cached.aiSnippet) {
                    this.coordinator.markCompleted(repoName, file.path, cached.summary);
                    DebugLogger.logCacheHit(repoName, file.path, cached.summary);

                    // In Tracer mode, feed worker with LOCAL data
                    if (window.IS_TRACER && this.workerPool.totalQueued < MAX_WORKER_QUEUE_SIZE) {
                        this.workerPool.enqueue(repoName, file.path, cached.aiSnippet, file.sha);
                    }
                    return { path: file.path, snippet: cached.aiSnippet, fromCache: true };
                }
                // If only truncated snippet exists (old cache), fall through to download (UPGRADE)
            }

            // If not in Tracer mode AND we don't need an update, use cached contentSnippet if available
            if (!needsUpdate && !(typeof window !== 'undefined' && window.IS_TRACER)) {
                const cached = await CacheRepository.getFileSummary(username, repoName, file.path);
                if (cached) {
                    this.coordinator.markCompleted(repoName, file.path, cached.summary);
                    DebugLogger.logCacheHit(repoName, file.path, cached.summary);

                    // CRITICAL FIX: In Tracer mode, FORCE worker execution even if content is cached
                    // This ensures we regenerate findings after a memory reset
                    if (window.IS_TRACER && this.workerPool.totalQueued < MAX_WORKER_QUEUE_SIZE) {
                        this.workerPool.enqueue(repoName, file.path, cached.contentSnippet || '', file.sha);
                    }

                    return { path: file.path, snippet: cached.contentSnippet || '', fromCache: true };
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
     * Identifies relevant files for analysis - BROADENED for 100% coverage
     */
    identifyAnchorFiles(tree) {
        // FILTER V3: Strict exclusions based on "Anti-Smoke" audit
        const excludeExtensions = [
            // Media
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp4', '.ico',
            // Documents/Archives
            '.pdf', '.zip', '.tar', '.gz', '.rar',
            // Executables/Binary
            '.exe', '.dll', '.bin', '.so', '.dylib', '.class', '.o', '.obj',
            // Fonts (CRITICAL source of hallucinations)
            '.ttf', '.otf', '.woff', '.woff2', '.eot',
            // Engine/Config Noise
            '.import', '.lock', '.meta', '.map', '.min.js', '.min.css'
        ];

        // Folders that contain noise/demos, not architecture
        const noiseDirs = ['/demo/', '/examples/', '/test/', '/tests/', '/spec/', '/vendor/', '/node_modules/', '/dist/', '/build/', '/coverage/'];

        return tree.filter(node => {
            if (node.type !== 'blob') return false;
            const lowerPath = node.path.toLowerCase();

            // 1. Extension Filter
            const isExcludedExt = excludeExtensions.some(ext => lowerPath.endsWith(ext));
            if (isExcludedExt) return false;

            // 2. Hidden Files
            if (lowerPath.includes('/.') || lowerPath.startsWith('.')) return false;

            // 3. Smart Path Filter (Token-based)
            const pathTokens = lowerPath.split(/[\\/]/); // Split by / or \
            const filename = pathTokens[pathTokens.length - 1];

            // Critical: "Assets" folder logic
            // Only allow assets if they are documentation
            // Critical: "Assets" folder logic
            // FILTER V4: Draconian Assets Policy
            // Only allow README.md in assets. Block licenses, txts, etc inside assets as they are usually noise.
            if (pathTokens.includes('assets') || pathTokens.includes('static') || pathTokens.includes('public')) {
                if (filename.toLowerCase() !== 'readme.md') return false;
            }

            // Critical: "Demo" / "Test" / "Vendor" logic
            // Block if ANY part of the path contains these words
            const toxicTokens = ['demo', 'example', 'test', 'spec', 'vendor', 'node_modules', 'dist', 'build', 'coverage', 'mock', 'fixture', 'icomoon'];

            const hasToxicToken = pathTokens.some(token => {
                // Exact match of folder name OR filename starting with token
                return toxicTokens.some(toxic => token === toxic || token.startsWith(toxic + '-') || token.endsWith('-' + toxic) || filename.startsWith(toxic));
            });

            if (hasToxicToken) return false;

            return true;
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
