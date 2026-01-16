/**
 * CodeScanner - Deep code scanning of repositories
 * Extracted from ProfileAnalyzer to comply with SRP
 * UPDATED: Uses centralized Logger and CacheRepository
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { DebugLogger } from '../utils/debugLogger.js';

import { AISlotPriorities } from './ai/AISlotManager.js';

// Configuration constants
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
     * Scans all user repositories (Phase 1: Urgent Anchors)
     * @param {string} username 
     * @param {Array} repos 
     * @param {Function} onStep 
     * @returns {Promise<Array>} Curated findings + Pending Files
     */
    async scan(username, repos, onStep = null, options = {}) {
        const maxRepos = options.maxRepos || (window.IS_TRACER ? DEFAULT_MAX_REPOS : 50000);
        const maxAnchors = options.maxAnchors || (window.IS_TRACER ? DEFAULT_MAX_ANCHORS : 50000);

        // Sort by updated date (descending) and slice for 10x10 logic
        // If IS_TRACER is false (Chat mode), we want to scan MORE repos? 
        // The previous logic had a hard slice. Users might want "unlimited".
        // sticking to existing logic for now.
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

                // Identify "Anchor" files (Architecture/Urgent)
                const anchors = this.identifyAnchorFiles(treeFiles);

                // Identify "Pending" files (Background) - Everything else
                // Filter out anchors to avoid duplicates
                const anchorPaths = new Set(anchors.map(a => a.path));
                const pendingFiles = treeFiles.filter(f => f.type === 'blob' && !anchorPaths.has(f.path));

                // Audit anchor files (URGENT PRIORITY)
                const repoAudit = await this.auditFiles(username, repo.name, anchors.slice(0, maxAnchors), needsFullScan, onStep, AISlotPriorities.URGENT);

                // Save tree SHA in cache
                await CacheRepository.setRepoTreeSha(username, repo.name, treeSha);

                // PERSISTENCE V3: Save Repo Memory
                const { memoryManager } = await import('./memory/MemoryManager.js');
                await memoryManager.persistRepoMemory(repo.name);

                allFindings.push({
                    repo: repo.name,
                    techStack: anchors.map(a => a.path),
                    auditedFiles: repoAudit.filter(f => f !== null),
                    pendingFiles: pendingFiles // Pass pending files for Phase 2
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
        Logger.progress(stats.analyzed, stats.totalFiles, 'archivos descargados (Fase 1)');

        return allFindings;
    }

    /**
     * Phase 2: Process background files (Unified Queue)
     * Replaces BackgroundAnalyzer
     */
    async processBackgroundFiles(username, allFindings, onStep) {
        let maxBackgroundFiles = 99999;
        if (typeof window !== 'undefined' && window.IS_TRACER) {
            Logger.info('BACKGROUND', 'Tracer Mode: Limiting background analysis to 5 files (Total) for verification.');
            maxBackgroundFiles = 5;
        }

        Logger.background('UnifiedWorkerQueue: Starting background ingestion...');

        // extract all pending files from findings
        const allPending = [];
        allFindings.forEach(f => {
            if (f.pendingFiles && f.pendingFiles.length > 0) {
                f.pendingFiles.forEach(file => {
                    allPending.push({ repo: f.repo, ...file });
                });
            }
        });

        if (allPending.length === 0) {
            Logger.success('BACKGROUND', 'No pending files. Full coverage.');
            return;
        }

        // Slice for Tracer limit if applicable
        const filesToProcess = allPending.slice(0, maxBackgroundFiles);

        // Process in throttled batches to avoid network saturation (Downloading is the bottleneck)
        const BATCH_SIZE = 5;
        for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
            if (window.AI_OFFLINE) break;

            const batch = filesToProcess.slice(i, i + BATCH_SIZE);

            // Reuse auditFiles logic but with BACKGROUND priority
            // We group by repo to minimize context switching? 
            // auditFiles expects a single repoName.
            // Our batch might have mixed repos.

            // Group batch by repo
            const batchByRepo = {};
            batch.forEach(item => {
                if (!batchByRepo[item.repo]) batchByRepo[item.repo] = [];
                batchByRepo[item.repo].push(item);
            });

            await Promise.all(Object.keys(batchByRepo).map(async repoName => {
                // Pass AISlotPriorities.BACKGROUND
                await this.auditFiles(username, repoName, batchByRepo[repoName], true, null, AISlotPriorities.BACKGROUND);
            }));

            // Persist all affected repos in the batch
            const affectedRepos = Object.keys(batchByRepo);
            const { memoryManager } = await import('./memory/MemoryManager.js');
            await Promise.all(affectedRepos.map(repoName => memoryManager.persistRepoMemory(repoName)));

            // Small breathing room for UI
            await new Promise(r => setTimeout(r, 50));
        }

        Logger.success('BACKGROUND', 'All background files enqueued.');
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
    async auditFiles(username, repoName, files, needsFullScan, onStep, priority = AISlotPriorities.NORMAL) {
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

                    // FEED WORKER: Even if cached, we might want to re-analyze if it's high priority or in Tracer mode
                    // For URGENT files or TRACER mode, we force enqueue with local content
                    // For BACKGROUND files, we might skip if summary is already good? 
                    // Current logic: force enqueue if Tracer. 
                    // New logic: Use priority.

                    if (window.IS_TRACER && this.workerPool.totalQueued < MAX_WORKER_QUEUE_SIZE) {
                        this.workerPool.enqueue(repoName, file.path, cached.aiSnippet, file.sha, priority);
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

                    // Force re-analysis if Tracer
                    if (window.IS_TRACER && this.workerPool.totalQueued < MAX_WORKER_QUEUE_SIZE) {
                        this.workerPool.enqueue(repoName, file.path, cached.contentSnippet || '', file.sha, priority);
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
                    this.workerPool.enqueue(repoName, file.path, codeSnippet, contentRes.sha, priority);
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
