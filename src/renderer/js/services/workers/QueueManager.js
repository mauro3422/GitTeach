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
    }

    /**
     * Enqueue a single file for processing
     */
    enqueue(repoName, filePath, content, sha) {
        this.queue.push({
            repo: repoName,
            path: filePath,
            content: content,
            sha: sha,
            status: 'pending'
        });
        this.totalQueued++;
    }

    /**
     * Enqueue multiple files
     */
    enqueueBatch(files) {
        files.forEach(f => this.enqueue(f.repo, f.path, f.content, f.sha));
    }

    /**
     * Get next item or batch of items to process.
     * Prioritizes:
     * 1. Files with name affinity to last processed (e.g., config -> dependents)
     * 2. Files from the same repository (stickiness)
     * 3. Batching of small files
     * 
     * @param {number} workerId - ID of the requesting worker
     * @param {string|null} claimedRepo - Currently claimed repo by this worker
     * @param {string|null} lastProcessedPath - Last processed file path
     * @returns {Object|null} - Next item, batch object, or null if queue empty
     */
    getNextItem(workerId, claimedRepo, lastProcessedPath = null) {
        const MAX_BATCH_SIZE = 3;
        const MIN_CONTENT_FOR_BATCH = 1000;

        // 1. Try to continue with current repo and look for affinities
        if (claimedRepo) {
            const pendingInRepo = this.queue.filter(item => item.status === 'pending' && item.repo === claimedRepo);

            if (pendingInRepo.length > 0) {
                // Name affinity: if last was "config", prioritize similar files or same dir
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

                // Batching logic: if first is small, look for more small files
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

        // 2. If no more from that repo or affinity, find a "free" repo
        const activeRepos = new Set(this.queue.filter(i => i.status === 'processing' || i.status === 'assigned').map(i => i.repo));
        const nextPending = this.queue.find(item => item.status === 'pending' && !activeRepos.has(item.repo));

        if (nextPending) {
            const repo = nextPending.repo;
            const repoItems = this.queue.filter(item => item.status === 'pending' && item.repo === repo);
            const first = repoItems[0];

            if (first.content.length < MIN_CONTENT_FOR_BATCH) {
                const batch = [];
                for (const item of repoItems) {
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
                return batch.length > 1 ? { repo: repo, isBatch: true, items: batch } : batch[0];
            } else {
                first.status = 'assigned';
                return first;
            }
        }

        // 3. Fallback: any pending item
        const anyItem = this.queue.find(item => item.status === 'pending');
        if (anyItem) {
            anyItem.status = 'assigned';
            return anyItem;
        }

        return null;
    }

    /**
     * Increment processed count
     */
    markProcessed(count = 1) {
        this.processedCount += count;
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
