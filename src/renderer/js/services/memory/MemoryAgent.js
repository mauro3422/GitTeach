/**
 * MemoryAgent - RAG Interface for Technical Memory V3 (Vector Edition)
 * 
 * Responsibilities:
 * - Query the MemoryManager using Vector Search (Cosine Similarity).
 * - Construct context for LLM prompts.
 * - Interface between User/Chat and Deep Memory.
 */
import { memoryManager } from './MemoryManager.js';
import { AIService } from '../aiService.js';
import { Logger } from '../../utils/logger.js';

export class MemoryAgent {
    constructor() {
        this.similarityThreshold = 0.5;
    }

    /**
     * Search memory using Cosine Similarity + Weights
     * @param {string} query - User query
     * @param {number} limit - Max results
     */
    async search(query, limit = 5) {
        // 1. Get Query Embedding
        const queryVector = await AIService.getEmbedding(query);
        if (!queryVector) {
            Logger.warn('MemoryAgent', 'Could not generate embedding for query. Falling back to keyword search (TODO).');
            return []; // Fail fast for now, or implement keyword fallback
        }

        // 2. Scan all nodes (Linear Scan is fine for < 10k nodes)
        // In V4 we might need a HNSW index
        const allNodes = memoryManager.getAllNodes();
        const scoredNodes = [];

        for (const node of allNodes) {
            // Only consider nodes with ready embeddings
            if (node.vectorStatus !== 'ready' || !node.embedding) continue;

            const similarity = this._cosineSimilarity(queryVector, node.embedding);

            // Weight Boosting: Confidence & Complexity
            // We want high confidence and high complexity to boost relevance slightly
            const boost = (node.confidence * 0.2) + (node.complexity * 0.05);
            const finalScore = similarity + boost;

            if (finalScore > this.similarityThreshold) {
                scoredNodes.push({ node, score: finalScore, similarity });
            }
        }

        // 3. Rank and Slice
        scoredNodes.sort((a, b) => b.score - a.score);
        return scoredNodes.slice(0, limit);
    }

    /**
     * Generate a Context Block for LLM injection
     */
    async retrieveContext(query) {
        const results = await this.search(query, 7);
        if (results.length === 0) return "";

        const contextParts = results.map(hit => {
            const n = hit.node;
            return `[MEMORY:${n.uid}] (Score:${hit.score.toFixed(2)})\n- Insight: ${n.insight}\n- File: ${n.repo}/${n.path}\n- Tech: ${n.classification}`;
        });

        return `\n=== RELEVANT TECHNICAL MEMORY ===\n${contextParts.join('\n\n')}\n=================================\n`;
    }

    /**
     * Math: Cosine Similarity
     */
    _cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

export const memoryAgent = new MemoryAgent();
