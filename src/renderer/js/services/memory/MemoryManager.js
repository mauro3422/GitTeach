/**
 * MemoryManager - Decoupled orchestrator for Technical Memory
 * 
 * Responsibilities:
 * - Listen for worker findings and convert them to MemoryNodes.
 * - Manage the GraphIndex (Interconnectivity).
 * - Handle persistence of nodes.
 * - Provide a clean interface for memory retrieval.
 */
import { MemoryNode } from './MemoryNode.js';
import { logManager } from '../../utils/logManager.js';
import { CacheRepository } from '../../utils/cacheRepository.js';

export class MemoryManager {
    constructor(options = {}) {
        this.nodes = new Map(); // Global memory map [UID -> Node]
        this.repoIndexes = new Map(); // Index by repository [RepoName -> [UIDs]]

        this.embeddingBuffer = [];
        this.BATCH_SIZE = (typeof window !== 'undefined' && window.IS_TRACER) ? 2 : 10;
        this.FLUSH_INTERVAL = (typeof window !== 'undefined' && window.IS_TRACER) ? 2000 : 500; // ms
        this.THROTTLE_DELAY = 500; // ms delay between batches
        this.lastFlushTime = 0;
        this.flushTimer = null;

        // Dependency injection to resolve circular dependencies
        this.embeddingService = options.embeddingService || null;

        this.logger = logManager.child({ component: 'MemoryManager' });
        this.logger.info('Decoupled Memory V3 initialized (Batching Enabled).');
    }

    /**
     * Set the embedding service (to resolve circular dependencies)
     */
    setEmbeddingService(embeddingService) {
        this.embeddingService = embeddingService;
    }

    /**
     * Core handler for incoming findings
     * @param {Object} finding - Raw finding from worker
     * @returns {MemoryNode} The created node
     */
    async storeFinding(finding) {
        // Robust extraction of weights
        const confidence = finding.confidence || finding.params?.confidence || 0.7;
        const complexity = finding.complexity || finding.params?.complexity || 2;

        const node = new MemoryNode({
            repo: finding.repo,
            path: finding.path || finding.file, // Robust path extraction
            insight: finding.insight || finding.summary || finding.params?.insight,
            evidence: finding.impact || finding.evidence || finding.params?.impact,
            classification: finding.technical_strength || finding.classification || finding.params?.technical_strength || 'General',
            confidence: parseFloat(confidence),
            complexity: parseInt(complexity),
            metadata: finding.metadata || {}, // NEW: Captures SOLID, modularity, etc.
            file_meta: finding.file_meta || {} // NEW: For churn analysis
        });

        await this.addNode(node);

        const persistenceFinding = { ...finding, uid: node.uid };
        CacheRepository.appendRepoRawFinding(finding.repo, persistenceFinding).then(async () => {
            this.logger.info(`✅ LevelDB Sync: Node ${node.uid} persisted to session storage.`);
            // Silent sync, no visual noise for raw findings
        }).catch(err => {
            this.logger.warn(`Failed to append raw finding for ${finding.repo}`, err);
        });

        return node;
    }

    /**
     * Persist curated memory for a specific repository
     * @param {string} repoName 
     */
    async persistRepoMemory(repoName) {
        // Ensure pending embeddings are flushed before persisting
        await this.flushEmbeddingBuffer();

        const nodes = this.getRepoMemory(repoName);
        if (nodes.length === 0) return;

        this.logger.info(`Persisting ${nodes.length} curated nodes for ${repoName}...`);
        await CacheRepository.persistRepoCuratedMemory(repoName, nodes);
    }

    /**
     * Persist memory for ALL repositories (Flush)
     */
    async persistAll() {
        this.logger.info('Flushing all repo memories to persistence...');

        // Ensure all pending embeddings are processed
        await this.flushEmbeddingBuffer();

        const repos = Array.from(this.repoIndexes.keys());
        await Promise.all(repos.map(repo => this.persistRepoMemory(repo)));
    }

    /**
     * Add a node to the memory and update indexes
     * @param {MemoryNode} node
     */
    async addNode(node) {
        this.nodes.set(node.uid, node);

        // Update Repo Index
        if (!this.repoIndexes.has(node.repo)) {
            this.repoIndexes.set(node.repo, []);
        }
        const repoList = this.repoIndexes.get(node.repo);
        if (!repoList.includes(node.uid)) {
            repoList.push(node.uid);
        }

        this.logger.info(`Node stored: ${node.uid} [${node.classification}] in ${node.repo} (Source: ${node.path})`);

        // Trigger batch-aware indexing
        this.indexNode(node);
    }

    /**
     * Queue node for embedding generation (Vector Indexing)
     * Replaces sequential processing with buffering
     */
    indexNode(node) {
        if (node.vectorStatus === 'ready') return;

        this.embeddingBuffer.push(node);

        // If buffer is full, flush immediately
        if (this.embeddingBuffer.length >= this.BATCH_SIZE) {
            this.flushEmbeddingBuffer();
        }
        // Otherwise, ensure a timer is running
        else if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => {
                this.flushEmbeddingBuffer();
            }, this.FLUSH_INTERVAL);
        }
    }

    /**
     * Process the buffered nodes in a single batch
     */
    async flushEmbeddingBuffer() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        if (this.embeddingBuffer.length === 0) return;

        // TECHNICAL THROTTLE: Ensure we don't saturate the bus
        const now = Date.now();
        const timeSinceLast = now - this.lastFlushTime;
        if (timeSinceLast < this.THROTTLE_DELAY) {
            if (!this.flushTimer) {
                this.flushTimer = setTimeout(() => this.flushEmbeddingBuffer(), this.THROTTLE_DELAY - timeSinceLast);
            }
            return;
        }
        this.lastFlushTime = now;

        // Take chunk
        const batch = this.embeddingBuffer.splice(0, this.embeddingBuffer.length);

        // Construct batch texts (filtered for safety)
        const texts = batch
            .map(node => `Insight: ${node.insight || 'N/A'}. Evidence: ${node.evidence || 'N/A'}. Context: ${node.repo}/${node.path}`)
            .filter(t => t.trim().length > 0);

        if (texts.length === 0) {
            batch.forEach(n => n.vectorStatus = 'ready'); // Mark as "processed" if nothing to do
            return;
        }

        try {
            // Check if embedding service is available
            if (!this.embeddingService) {
                this.logger.warn('Embedding service not available, skipping batch processing');
                batch.forEach(node => node.vectorStatus = 'failed');
                return;
            }

            // Call Batch API
            const embeddings = await this.embeddingService.batchEmbeddings(texts);

            // Assign results back to nodes
            batch.forEach((node, index) => {
                const embedding = embeddings[index];
                if (embedding) {
                    node.embedding = embedding;
                    node.vectorStatus = 'ready';
                } else {
                    node.vectorStatus = 'failed';
                    this.logger.warn(`Embedding generation failed for node ${node.uid}`);
                }
            });

            this.logger.info(`Batch processed ${batch.length} embeddings.`);

        } catch (error) {
            this.logger.error(`Batch embedding failed: ${error.message}`);
            // Revert vectorStatus to pending or failed?
            // Currently failing the batch
            batch.forEach(node => node.vectorStatus = 'failed');
        }
    }

    /**
     * Get all nodes for scanning
     */
    getAllNodes() {
        return Array.from(this.nodes.values());
    }

    /**
     * Link two nodes (Bidirectional)
     */
    linkNodes(uid1, uid2) {
        const node1 = this.nodes.get(uid1);
        const node2 = this.nodes.get(uid2);

        if (node1 && node2) {
            node1.addLink(uid2);
            node2.addLink(uid1);
        }
    }

    /**
     * Get nodes by repository
     */
    getRepoMemory(repoName) {
        const uids = this.repoIndexes.get(repoName) || [];
        return uids.map(uid => this.nodes.get(uid));
    }

    /**
     * Get nodes by high impact (Weighted)
     */
    getHighImpactMemory(minComplexity = 4) {
        return Array.from(this.nodes.values())
            .filter(n => n.complexity >= minComplexity)
            .sort((a, b) => (b.complexity * b.confidence) - (a.complexity * a.confidence));
    }

    /**
     * Clear all memory (used during cache clear)
     */
    clear() {
        this.nodes.clear();
        this.repoIndexes.clear();
        this.logger.info('Memory cache cleared.');
    }
}

// Export singleton instance
export const memoryManager = new MemoryManager();
