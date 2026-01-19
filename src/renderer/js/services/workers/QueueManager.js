/**
 * QueueManager - Manages the work queue for AI workers
 * Extracted from AIWorkerPool to comply with SRP
 * 
 * Responsibilities:
 * - Enqueue items for processing
 * - Batch small files together
 * - Prioritize files by repo affinity and naming patterns
 */
import { Logger } from '../../utils/logger.js';

export class QueueManager {
    constructor() {
        this.queue = [];
        this.totalQueued = 0;
        this.processedCount = 0;
        this.processedShas = new Map(); // SHA -> Summary (Session cache)
        this.activeKeys = new Set(); // repo:path (Prevention of duplicate enqueues)
        this.isEnqueueingComplete = false; // Graceful drain flag

        // Reactive signals
        this.waitingResolvers = [];
        this.workerRepoMap = new Map();
        this.repoWorkerCount = new Map();
    }

    /**
     * Enqueue a single file for processing
     */
    enqueue(repoName, filePath, content, sha, priority = 1, fileMeta = {}) { // Default to NORMAL (1)
        const key = `${repoName}:${filePath}`;
        if (this.activeKeys.has(key)) return; // Already in queue

        this.queue.push({
            repo: repoName,
            path: filePath,
            content: content,
            sha: sha,
            status: 'pending',
            priority: priority,
            file_meta: fileMeta
        });
        this.activeKeys.add(key);
        this.totalQueued++;

        // Keep queue sorted by priority
        this.queue.sort((a, b) => a.priority - b.priority);

        // Notify waiting workers
        this._notifyNewItems();
    }

    _notifyNewItems() {
        if (this.waitingResolvers.length > 0) {
            const resolvers = this.waitingResolvers;
            this.waitingResolvers = [];
            resolvers.forEach(resolve => resolve());
        }
    }

    /**
     * Wait for new items to arrive
     */
    async waitForItems() {
        return new Promise(resolve => {
            this.waitingResolvers.push(resolve);
            // Safety timeout to avoid getting stuck
            setTimeout(resolve, 1000);
        });
    }

    /**
     * Enqueue multiple files
     */
    enqueueBatch(files, priority = 1) {
        files.forEach(f => this.enqueue(f.repo, f.path, f.content, f.sha, priority));
    }

    /**
     * Set enqueueing complete flag for graceful drain
     */
    setEnqueueingComplete() {
        this.isEnqueueingComplete = true;
    }

    /**
     * Get next item or batch of items to process.
     * Prioritizes:
     * 0. HIGHEST PRIORITY (Ascending order of priority field) - handled by sort on enqueue
     * 1. REPO DISTRIBUTION: Ensure workers spread across different repos initially
     * 2. Files with name affinity to last processed (e.g., config -> dependents)
     * 3. Files from the same repository (stickiness)
     * 4. Batching of small files
     *
     * @param {number} workerId - ID of the requesting worker
     * @param {string|null} claimedRepo - Currently claimed repo by this worker
     * @param {string|null} lastProcessedPath - Last processed file path
     * @returns {Object|null} - Next item, batch object, sentinel, or null if queue empty and complete
     */
    getNextItem(workerId, claimedRepo, lastProcessedPath = null) {
        const MAX_BATCH_SIZE = 3;
        const MIN_CONTENT_FOR_BATCH = 1000;

        // 1. FILTER: Only look at pending items
        const pendingItems = this.queue.filter(i => i.status === 'pending');
        if (pendingItems.length === 0) {
            // GRACEFUL DRAIN: Keep workers alive if enqueueing is not complete or others are busy
            const hasActiveWork = Array.from(this.repoWorkerCount.values()).some(count => count > 0);
            if (!this.isEnqueueingComplete || hasActiveWork) {
                return { isWaiting: true };
            }
            return null;
        }

        // 2. DISTRIBUTION: Manage worker affinity
        const pendingRepos = [...new Set(pendingItems.map(i => i.repo))];
        const oldAffinity = this.workerRepoMap.get(workerId);

        // If worker is idle or its current repo is finished, assign to least-loaded repo
        if (!claimedRepo || !pendingRepos.includes(claimedRepo)) {
            let minWorkers = Infinity;
            let targetRepo = null;

            for (const repo of pendingRepos) {
                const workerCount = this.repoWorkerCount.get(repo) || 0;
                if (workerCount < minWorkers) {
                    minWorkers = workerCount;
                    targetRepo = repo;
                }
            }

            if (targetRepo && targetRepo !== claimedRepo) {
                this._updateWorkerAffinity(workerId, targetRepo);
                claimedRepo = targetRepo;
            }
        } else if (claimedRepo !== oldAffinity) {
            this._updateWorkerAffinity(workerId, claimedRepo);
        }

        // 3. RETRIEVAL: Try claimed repo first (Affinity/Stickiness)
        const pendingInRepo = pendingItems.filter(item => item.repo === claimedRepo);
        const globalTopPriority = pendingItems[0].priority;
        const repoTopPriority = pendingInRepo.length > 0 ? pendingInRepo[0].priority : 999;

        // Only use affinity if it doesn't starve higher priority global tasks
        if (pendingInRepo.length > 0 && repoTopPriority <= globalTopPriority) {
            if (lastProcessedPath) {
                const lastDir = lastProcessedPath.split('/').slice(0, -1).join('/');
                const lastNameBase = lastProcessedPath.split('/').pop().split('.')[0].toLowerCase();

                const affinityItem = pendingInRepo.find(item => {
                    const itemDir = item.path.split('/').slice(0, -1).join('/');
                    const itemNameBase = item.path.split('/').pop().split('.')[0].toLowerCase();
                    return itemDir === lastDir || itemNameBase.includes(lastNameBase) || lastNameBase.includes(itemNameBase);
                });

                if (affinityItem) {
                    affinityItem.status = 'assigned';
                    return affinityItem;
                }
            }

            // Batching logic
            const first = pendingInRepo[0];
            if (first.content.length < MIN_CONTENT_FOR_BATCH) {
                const batch = [];
                for (const item of pendingInRepo) {
                    if (item.content.length < MIN_CONTENT_FOR_BATCH && batch.length < MAX_BATCH_SIZE && item.priority === first.priority) {
                        item.status = 'assigned';
                        batch.push(item);
                    } else if (batch.length === 0) {
                        item.status = 'assigned';
                        return item;
                    } else { break; }
                }
                return batch.length > 1 ? { repo: claimedRepo, isBatch: true, items: batch } : batch[0];
            } else {
                first.status = 'assigned';
                return first;
            }
        }

        // 4. FALLBACK: Take highest priority global item
        const topItem = pendingItems[0];
        topItem.status = 'assigned';

        // Sync affinity if switching repos
        if (topItem.repo !== claimedRepo) {
            this._updateWorkerAffinity(workerId, topItem.repo);
        }

        return topItem;
    }

    _updateWorkerAffinity(workerId, newRepo) {
        const oldRepo = this.workerRepoMap.get(workerId);
        if (oldRepo === newRepo) return;

        if (oldRepo) {
            const count = this.repoWorkerCount.get(oldRepo) || 0;
            this.repoWorkerCount.set(oldRepo, Math.max(0, count - 1));
        }

        if (newRepo) {
            this.workerRepoMap.set(workerId, newRepo);
            this.repoWorkerCount.set(newRepo, (this.repoWorkerCount.get(newRepo) || 0) + 1);
        } else {
            this.workerRepoMap.delete(workerId);
        }

        Logger.worker('POOL', `[Worker ${workerId}] Affinity: ${oldRepo || 'NONE'} -> ${newRepo || 'NONE'}`);
    }

    /**
     * Increment processed count
     */
    markProcessed(itemsOrCount) {
        if (Array.isArray(itemsOrCount)) {
            itemsOrCount.forEach(item => {
                this.processedCount++;
                this.activeKeys.delete(`${item.repo}:${item.path}`);
                if (item.sha && item.summary) {
                    this.processedShas.set(item.sha, item.summary);
                }
            });
        } else {
            this.processedCount += itemsOrCount;
        }
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queued: this.totalQueued,
            processed: this.processedCount,
            pending: this.queue.filter(i => i.status === 'pending').length,
            failed: this.queue.filter(i => i.status === 'failed').length,
            percent: this.totalQueued > 0
                ? Math.round((this.processedCount / this.totalQueued) * 100)
                : 0
        };
    }

    /**
     * Clear the queue
     */
    clear() {
        this.queue = [];
        this.processedCount = 0;
        this.totalQueued = 0;
    }
}
