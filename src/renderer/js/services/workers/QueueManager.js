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
     * 1. Files with name affinity to last processed (e.g., config -> dependents)
     * 2. Files from the same repository (stickiness)
     * 3. Batching of small files
     *
     * @param {number} workerId - ID of the requesting worker
     * @param {string|null} claimedRepo - Currently claimed repo by this worker
     * @param {string|null} lastProcessedPath - Last processed file path
     * @returns {Object|null} - Next item, batch object, sentinel, or null if queue empty and complete
     */
    getNextItem(workerId, claimedRepo, lastProcessedPath = null) {
        const MAX_BATCH_SIZE = 3;
        const MIN_CONTENT_FOR_BATCH = 1000;

        // FILTER: Only look at pending items
        const pendingItems = this.queue.filter(i => i.status === 'pending');
        if (pendingItems.length === 0) {
            // GRACEFUL DRAIN: If no items but enqueueing not complete, return sentinel to wait
            if (!this.isEnqueueingComplete) {
                return { isWaiting: true };
            }
            return null;
        }

        // URGENT OVERRIDE: If we have URGENT items (0) and current claimedRepo is lower priority, 
        // we might want to switch? For now, simple logic: get highest priority available.
        // Queue is already sorted by priority.

        // 1. Try to continue with current repo IF it has high priority items
        if (claimedRepo) {
            const pendingInRepo = pendingItems.filter(item => item.repo === claimedRepo);

            // If repo has items, check if they are "top priority" relative to the whole queue.
            // If the first item in global queue has significantly higher priority (lower val) than this repo's items, switch.
            const globalTopPriority = pendingItems[0].priority;
            const repoTopPriority = pendingInRepo.length > 0 ? pendingInRepo[0].priority : 999;

            if (pendingInRepo.length > 0 && repoTopPriority <= globalTopPriority) {
                // Proceed with affinity logic for this repo
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

                // Batching logic for repo
                const first = pendingInRepo[0];
                if (first.content.length < MIN_CONTENT_FOR_BATCH) {
                    const batch = [];
                    for (const item of pendingInRepo) {
                        if (item.content.length < MIN_CONTENT_FOR_BATCH && batch.length < MAX_BATCH_SIZE) {
                            item.status = 'assigned';
                            batch.push(item);
                        } else if (batch.length === 0) {
                            item.status = 'assigned';
                            return item;
                        } else {
                            break;
                        }
                    }
                    return batch.length > 1 ? { repo: claimedRepo, isBatch: true, items: batch } : batch[0];
                } else {
                    first.status = 'assigned';
                    return first;
                }
            }
        }

        // 2. Fallback: Take the highest priority item from global queue
        // Since queue is sorted (0=URGENT first), we just take the first pending one that isn't locked by another worker processing same repo?
        // Actually, we want parallelism. Multiple activeworkers on same repo is FINE if pool size allows.
        // But we want to avoid fragmentation.

        // Find first available repo that is top priority
        const topItem = pendingItems[0];

        // Batching for fallback
        if (topItem.content.length < MIN_CONTENT_FOR_BATCH) {
            const repoItems = pendingItems.filter(i => i.repo === topItem.repo);
            const batch = [];
            for (const item of repoItems) {
                if (item.content.length < MIN_CONTENT_FOR_BATCH && batch.length < MAX_BATCH_SIZE && item.priority === topItem.priority) {
                    item.status = 'assigned';
                    batch.push(item);
                } else if (batch.length === 0) {
                    item.status = 'assigned';
                    return item;
                } else { break; }
            }
            return batch.length > 1 ? { repo: topItem.repo, isBatch: true, items: batch } : batch[0];
        } else {
            topItem.status = 'assigned';
            return topItem;
        }
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
