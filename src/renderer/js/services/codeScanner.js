/**
 * CodeScanner - Lightweight facade for code scanning pipeline
 * REFACTORED: Delegates to specialized modules (SRP compliant)
 *
 * SOLID Principles:
 * - S: Only orchestrates scanning pipeline and coordinates modules
 * - O: Extensible via module composition
 * - L: N/A (no inheritance)
 * - I: Minimal interface for code scanning
 * - D: Depends on injected specialized modules
 *
 * Composed Modules:
 * - RepoTreeFetcher: Repository tree fetching and processing
 * - FileAuditor: File auditing, filtering, and caching
 * - BackgroundProcessor: Background file processing
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { RepoTreeFetcher } from './RepoTreeFetcher.js';
import { FileAuditor } from './FileAuditor.js';
import { BackgroundProcessor } from './BackgroundProcessor.js';
import { AISlotPriorities } from './ai/AISlotManager.js';

// Configuration constants
const DEFAULT_MAX_ANCHORS = 50;
const DEFAULT_MAX_REPOS = 3;

export class CodeScanner {
    constructor(coordinator, workerPool) {
        this.coordinator = coordinator;
        this.workerPool = workerPool;

        // Compose specialized modules
        this.repoTreeFetcher = new RepoTreeFetcher();
        this.fileAuditor = new FileAuditor(coordinator, workerPool);
        this.backgroundProcessor = new BackgroundProcessor(this.fileAuditor);
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

        // Sort by updated date (descending) and slice for dynamic logic
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

                // Register files in coordinator with strict capping
                this.coordinator.registerRepoFiles(repo.name, treeFiles, treeSha, maxAnchors);

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
        return this.backgroundProcessor.processBackgroundFiles(username, allFindings, onStep);
    }

    /**
     * Gets the file tree of a repo (own or fork)
     */
    async getRepoTree(username, repo, onStep, allFindings) {
        return this.repoTreeFetcher.getRepoTree(username, repo, onStep, allFindings);
    }

    /**
     * Audits a list of files, downloading content and saving to cache
     */
    async auditFiles(username, repoName, files, needsFullScan, onStep, priority = AISlotPriorities.NORMAL) {
        // Filter out files that were technically "skipped" by the inventory capping
        const repoEntry = this.coordinator.inventory.repos.find(r => r.name === repoName);
        const filtered = files.filter(f => {
            const coordFile = repoEntry?.files.find(cf => cf.path === f.path);
            if (coordFile && coordFile.status === 'skipped') return false;
            return true;
        });

        if (filtered.length === 0) return [];
        return this.fileAuditor.auditFiles(username, repoName, filtered, needsFullScan, onStep, priority);
    }

    /**
     * Identifies relevant files for analysis - BROADENED for 100% coverage
     */
    identifyAnchorFiles(tree) {
        return this.fileAuditor.identifyAnchorFiles(tree);
    }

    /**
     * Curates findings for the main AI
     */
    curateFindings(findings) {
        return this.fileAuditor.curateFindings(findings);
    }
}
