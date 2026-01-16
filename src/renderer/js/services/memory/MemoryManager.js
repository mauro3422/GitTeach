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
import { Logger } from '../../utils/logger.js';
import { CacheRepository } from '../../utils/cacheRepository.js';
import { AIService } from '../aiService.js';

export class MemoryManager {
    constructor() {
        this.nodes = new Map(); // Global memory map [UID -> Node]
        this.repoIndexes = new Map(); // Index by repository [RepoName -> [UIDs]]

        Logger.info('MemoryManager', 'Decoupled Memory V3 initialized.');
    }

    /**
     * Core handler for incoming findings
     * @param {Object} finding - Raw finding from worker
     * @returns {MemoryNode} The created node
     */
    storeFinding(finding) {
        const node = new MemoryNode({
            repo: finding.repo,
            path: finding.path,
            insight: finding.insight || finding.summary,
            evidence: finding.impact || finding.evidence,
            classification: finding.technical_strength || finding.classification,
            confidence: finding.confidence || 0.7,
            complexity: finding.complexity || 2,
            metadata: finding.metadata || {} // NEW: Captures SOLID, modularity, etc.
        });

        this.addNode(node);
        return node;
    }

    /**
     * Add a node to the memory and update indexes
     * @param {MemoryNode} node 
     */
    addNode(node) {
        this.nodes.set(node.uid, node);

        // Update Repo Index
        if (!this.repoIndexes.has(node.repo)) {
            this.repoIndexes.set(node.repo, []);
        }
        this.repoIndexes.get(node.repo).push(node.uid);

        Logger.debug('MemoryManager', `Node stored: ${node.uid} [${node.classification}] in ${node.repo}`);

        // Trigger async embedding generation
        this.indexNode(node).catch(err => console.error(err));
    }

    /**
     * Generate embedding for node (Vector Indexing)
     */
    async indexNode(node) {
        if (node.vectorStatus === 'ready') return;

        // Construct text to embed (Rich semantic representation)
        const textToEmbed = `Insight: ${node.insight}. Evidence: ${node.evidence}. Context: ${node.repo}/${node.path}`;

        const embedding = await AIService.getEmbedding(textToEmbed);
        if (embedding) {
            node.embedding = embedding;
            node.vectorStatus = 'ready';
            // Ideally save persistence here
        } else {
            node.vectorStatus = 'failed';
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
        Logger.info('MemoryManager', 'Memory cache cleared.');
    }
}

// Export singleton instance
export const memoryManager = new MemoryManager();
