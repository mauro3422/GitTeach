/**
 * GitTeach - AI-Powered GitHub Profile Generator
 * Copyright (C) 2026 Mauro (mauro3422)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * See LICENSE file for details.
 */

/**
 * MemoryAgent - Smart RAG Interface for Technical Memory V3
 * 
 * Responsibilities:
 * - Query multiple memory sources (vectors, curated, dna).
 * - Use searchTerms for multi-query vector search.
 * - Construct context for LLM prompts.
 */
import { memoryManager } from './MemoryManager.js';
import { AIService } from '../aiService.js';
import { CacheRepository } from '../../utils/cacheRepository.js';
import { Logger } from '../../utils/logger.js';

export class MemoryAgent {
    constructor() {
        this.similarityThreshold = 0.45; // Slightly lower for multi-term searches
    }

    /**
     * MAIN ENTRY: Retrieve context from specified source
     * @param {Object} params - { searchTerms, memorySource, username }
     */
    async retrieveFromSource(params) {
        const { searchTerms = [], memorySource = 'curated', username = 'unknown' } = params;

        Logger.info('MemoryAgent', `Source: ${memorySource}, Terms: [${searchTerms.join(', ')}]`);

        switch (memorySource) {
            case 'vectors':
                return await this.searchVectors(searchTerms);
            case 'curated':
                return await this.searchCurated(searchTerms, username);
            case 'dna':
                return await this.getDNA(username);
            case 'all':
                return await this.searchAll(searchTerms, username);
            default:
                return await this.searchCurated(searchTerms, username);
        }
    }

    /**
     * Search raw MemoryNodes using vector similarity
     */
    async searchVectors(searchTerms) {
        if (searchTerms.length === 0) return "";

        // Multi-term search: combine results from all terms
        const allResults = [];
        const seenUids = new Set();

        for (const term of searchTerms) {
            const results = await this.search(term, 3);
            for (const hit of results) {
                if (!seenUids.has(hit.node.uid)) {
                    seenUids.add(hit.node.uid);
                    allResults.push(hit);
                }
            }
        }

        if (allResults.length === 0) return "";

        // Re-rank by score
        allResults.sort((a, b) => b.score - a.score);
        const top = allResults.slice(0, 7);

        const contextParts = top.map(hit => {
            const n = hit.node;
            return `[VECTOR:${n.uid}] Score:${hit.score.toFixed(2)}\n- Insight: ${n.insight}\n- File: ${n.repo}/${n.path}\n- Domain: ${n.classification}`;
        });

        return `\n=== RAW VECTOR MEMORY ===\n${contextParts.join('\n\n')}\n=========================\n`;
    }

    /**
     * Search curated evidence (grouped by domain)
     */
    async searchCurated(searchTerms, username) {
        try {
            // Get curated evidence from cache (support both Tracer mock and real app)
            const cacheAPI = typeof window !== 'undefined' && window.cacheAPI ? window.cacheAPI : null;
            let findings;

            if (cacheAPI && cacheAPI.getTechnicalFindings) {
                findings = await cacheAPI.getTechnicalFindings(username);
            } else {
                findings = await CacheRepository.getTechnicalFindings(username);
            }

            // Handle both { evidence: {...} } and direct evidence object
            const evidence = findings?.evidence || findings;

            if (!evidence || Object.keys(evidence).length === 0) {
                Logger.warn('MemoryAgent', 'No curated evidence found, falling back to vectors.');
                return await this.searchVectors(searchTerms);
            }

            // Filter domains that match searchTerms
            const relevantDomains = [];
            const searchLower = searchTerms.map(t => t.toLowerCase());

            for (const [domain, items] of Object.entries(evidence)) {
                const domainLower = domain.toLowerCase();
                const isRelevant = searchLower.some(term =>
                    domainLower.includes(term) ||
                    items.some(item => item.summary?.toLowerCase().includes(term))
                );

                if (isRelevant || searchTerms.length === 0) {
                    relevantDomains.push({ domain, items: items.slice(0, 3) }); // Top 3 per domain
                }
            }

            if (relevantDomains.length === 0) {
                // If no match, return all domains summary
                relevantDomains.push(...Object.entries(evidence).slice(0, 5).map(([d, i]) => ({ domain: d, items: i.slice(0, 2) })));
            }

            const contextParts = relevantDomains.map(({ domain, items }) => {
                const itemList = items.map(i => `  • [${i.repo}] ${i.summary?.substring(0, 100) || 'N/A'}`).join('\n');
                return `[CURATED:${domain}]\n${itemList}`;
            });

            return `\n=== CURATED TECHNICAL INSIGHTS ===\n${contextParts.join('\n\n')}\n==================================\n`;

        } catch (e) {
            Logger.warn('MemoryAgent', `Curated search failed: ${e.message}`);
            return await this.searchVectors(searchTerms);
        }
    }

    /**
     * Get Developer DNA (identity profile)
     */
    async getDNA(username) {
        try {
            // Support both Tracer mock and real app
            const cacheAPI = typeof window !== 'undefined' && window.cacheAPI ? window.cacheAPI : null;
            let identity;

            if (cacheAPI && cacheAPI.getTechnicalIdentity) {
                identity = await cacheAPI.getTechnicalIdentity(username);
            } else {
                identity = await CacheRepository.getTechnicalIdentity(username);
            }

            if (!identity) return "";

            const traits = (identity.traits || []).map(t =>
                `  • ${t.name} (${t.score}/10): ${t.details}`
            ).join('\n');

            return `\n=== DEVELOPER DNA ===
Bio: ${identity.bio || 'N/A'}
Domain: ${identity.domain || 'General'}
Core Languages: ${(identity.core_languages || []).join(', ') || 'Varied'}

Traits:
${traits || '  (No traits defined)'}
=====================\n`;

        } catch (e) {
            Logger.warn('MemoryAgent', `DNA retrieval failed: ${e.message}`);
            return "";
        }
    }

    /**
     * Search ALL sources and combine
     */
    async searchAll(searchTerms, username) {
        const [vectors, curated, dna] = await Promise.all([
            this.searchVectors(searchTerms),
            this.searchCurated(searchTerms, username),
            this.getDNA(username)
        ]);

        return `${dna}\n${curated}\n${vectors}`;
    }

    /**
     * Legacy: Single-query vector search
     */
    async search(query, limit = 5) {
        const queryVector = await AIService.getEmbedding(query);
        if (!queryVector) {
            Logger.warn('MemoryAgent', 'Could not generate embedding for query.');
            return [];
        }

        const allNodes = memoryManager.getAllNodes();
        const scoredNodes = [];

        for (const node of allNodes) {
            if (node.vectorStatus !== 'ready' || !node.embedding) continue;

            const similarity = this._cosineSimilarity(queryVector, node.embedding);
            const boost = (node.confidence * 0.2) + (node.complexity * 0.05);
            const finalScore = similarity + boost;

            if (finalScore > this.similarityThreshold) {
                scoredNodes.push({ node, score: finalScore, similarity });
            }
        }

        scoredNodes.sort((a, b) => b.score - a.score);
        return scoredNodes.slice(0, limit);
    }

    /**
     * Legacy: Generate context for LLM (backward compatible)
     */
    async retrieveContext(query) {
        return await this.searchVectors([query]);
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

