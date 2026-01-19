/**
* EmbeddingService - Handles vector embeddings generation and processing
* Extracted from AIService to comply with SRP
*
* Responsibilities:
* - Generate text embeddings using AI service
* - Handle embedding fallbacks and error recovery
* - Batch embedding processing
* - Embedding caching and optimization
*/

import { logManager } from '../../utils/logManager.js';
import { pipelineEventBus } from '../pipeline/PipelineEventBus.js';

// Environment check
const isNode = typeof process !== 'undefined' && process.versions?.node;

export class EmbeddingService {
    constructor() {
        this.logger = logManager.child({ component: 'EmbeddingService' });
        this.cache = new Map();
        this.maxCacheSize = 1000;
    }

    /**
     * Generate embeddings for text
     * @param {string} text - Text to embed
     * @returns {Promise<Array<number>|null>} Embedding vector or null if failed
     */
    async getEmbedding(text) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return null;
        }

        // Check cache first
        const cacheKey = this.generateCacheKey(text);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Use tracer mock if in tracer mode (unless forced to use real AI)
        const _window = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global.window : {});
        const isForcedReal = _window?.FORCE_REAL_AI === true;

        if (this.isTracerMode() && !isForcedReal) {
            if (!this._hasLoggedTracer) {
                this.logger.info('🧪 Tracer Mode: Using deterministic mock embeddings.');
                this._hasLoggedTracer = true;
            }
            return this.getMockEmbedding(text);
        }

        try {
            const embedding = await this.callEmbeddingAPI(text);

            this.setCache(cacheKey, embedding);

            return embedding;
        } catch (error) {
            this.logger.warn(`Embedding generation failed: ${error.message}`);
            return this.getFallbackEmbedding(text);
        }
    }

    /**
     * Generate embeddings for multiple texts in batch
     * @param {Array<string>} texts - Array of texts to embed
     * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
     */
    async batchEmbeddings(texts) {
        if (!Array.isArray(texts)) {
            throw new Error('Texts must be an array');
        }

        // Tracer Mode Support for Batching (unless forced to use real AI)
        const _window = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global.window : {});
        const isTracer = this.isTracerMode();
        const isForcedReal = _window?.FORCE_REAL_AI === true;

        this.logger.info(`Batch Request: isTracer=${isTracer}, isForcedReal=${isForcedReal}, texts=${texts.length}`);

        if (isTracer && !isForcedReal) {
            return texts.map(text => this.getMockEmbedding(text));
        }

        const validTexts = texts.filter(text =>
            text && typeof text === 'string' && text.trim().length > 0
        );

        if (validTexts.length === 0) {
            return [];
        }

        // Check cache for all texts
        const results = [];
        const uncachedTexts = [];
        const uncachedIndices = [];

        validTexts.forEach((text, index) => {
            const cacheKey = this.generateCacheKey(text);
            if (this.cache.has(cacheKey)) {
                results[index] = this.cache.get(cacheKey);
            } else {
                results[index] = null; // Placeholder
                uncachedTexts.push(text);
                uncachedIndices.push(index);
            }
        });

        // Generate embeddings for uncached texts
        if (uncachedTexts.length > 0) {
            try {
                const embeddings = await this.batchEmbeddingAPI(uncachedTexts);

                // Fill results and cache
                uncachedIndices.forEach((resultIndex, batchIndex) => {
                    const embedding = embeddings[batchIndex];
                    results[resultIndex] = embedding;

                    const cacheKey = this.generateCacheKey(validTexts[resultIndex]);
                    this.setCache(cacheKey, embedding);
                });
            } catch (error) {
                this.logger.warn(`Batch embedding failed: ${error.message}`);

                // Use fallbacks for failed embeddings
                uncachedIndices.forEach(resultIndex => {
                    const text = validTexts[resultIndex];
                    results[resultIndex] = this.getFallbackEmbedding(text);

                    const cacheKey = this.generateCacheKey(text);
                    this.setCache(cacheKey, results[resultIndex]);
                });
            }
        }

        return results;
    }

    /**
     * Call the embedding API endpoint
     * @param {string} text - Text to embed
     * @returns {Promise<Array<number>>} Embedding vector
     */
    async callEmbeddingAPI(text) {
        const ENDPOINT = this.getEmbeddingEndpoint();
        const eventPayload = {
            port: 8001,
            type: 'embedding',
            textLength: text.length
        };

        // NUEVO: Emitir evento de inicio
        pipelineEventBus.emit('embedding:start', eventPayload);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const payload = {
                model: "nomic-embed-text-v1.5",
                input: text.startsWith('search_document:') ? text : `search_document: ${text}`
            };

            // SESSION LOGGING (User Request: session-based trace)
            const isTracer = typeof window !== 'undefined' && window.IS_TRACER;
            if (isTracer && typeof window !== 'undefined' && window.debugAPI) {
                const sessionId = document.getElementById('session-id')?.textContent?.replace('SESSION: ', '') || 'current';
                window.debugAPI.appendLog(sessionId, 'embeddings', `request_${Date.now()}.json`, {
                    endpoint: ENDPOINT,
                    input: text.substring(0, 100) + '...',
                    length: text.length
                });
            }

            const response = await fetch(ENDPOINT, {
                signal: controller.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Embedding API error: ${response.status}`);
            }

            const data = await response.json();

            if (isTracer && typeof window !== 'undefined' && window.debugAPI) {
                const sessionId = document.getElementById('session-id')?.textContent?.replace('SESSION: ', '') || 'current';
                window.debugAPI.appendLog(sessionId, 'embeddings', `response_${Date.now()}.json`, {
                    status: response.status,
                    vectorSize: data.data?.[0]?.embedding?.length || 0
                });
            }

            if (data && data.data && data.data.length > 0 && data.data[0].embedding) {
                // NUEVO: Emitir evento de fin exitoso
                pipelineEventBus.emit('embedding:end', {
                    ...eventPayload,
                    success: true,
                    vectorSize: data.data[0].embedding.length
                });
                return data.data[0].embedding;
            }

            throw new Error('Invalid embedding response format');
        } catch (error) {
            // NUEVO: Emitir evento de fin con error
            pipelineEventBus.emit('embedding:end', {
                ...eventPayload,
                success: false,
                error: error.message
            });
            if (error.name === 'AbortError') {
                throw new Error('Embedding request timeout');
            }
            throw error;
        }
    }

    /**
     * Call batch embedding API
     * @param {Array<string>} texts - Array of texts to embed
     * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
     */
    async batchEmbeddingAPI(texts) {
        const _window = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global.window : {});
        const ENDPOINT = this.getEmbeddingEndpoint();
        const eventPayload = {
            port: 8001,
            type: 'batch-embedding',
            batchSize: texts.length,
            totalTextLength: texts.reduce((sum, t) => sum + t.length, 0)
        };

        // NUEVO: Emitir evento de inicio para batch
        pipelineEventBus.emit('embedding:start', eventPayload);

        this.logger.debug(`Requesting batch: ${texts.length} texts -> ${ENDPOINT}`);

        if (isNode) {
            try {
                const fs = await import('fs');
                (fs.appendFileSync || fs.default.appendFileSync)('embedding_debug.log', `[Batch Request] ${texts.length} texts\n`);
            } catch (e) { }
        }

        let attempt = 0;
        const maxRetries = 4;
        const baseDelay = 1000;

        while (attempt < maxRetries) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for batch

            try {
                const payload = {
                    model: "nomic-embed-text-v1.5",
                    input: texts.map(t => t.startsWith('search_document:') ? t : `search_document: ${t}`)
                };

                const response = await fetch(ENDPOINT, {
                    signal: controller.signal,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.data && Array.isArray(data.data)) {
                        const embeddings = data.data.map(item => item.embedding).filter(emb => emb);
                        // NUEVO: Emitir evento de fin exitoso para batch
                        pipelineEventBus.emit('embedding:end', {
                            ...eventPayload,
                            success: true,
                            vectorCount: embeddings.length
                        });
                        return embeddings;
                    }
                    throw new Error('Invalid batch embedding response format');
                }

                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`Embedding API client error: ${response.status}`);
                }

                throw new Error(`Server returned ${response.status}`);

            } catch (error) {
                clearTimeout(timeoutId);
                attempt++;

                const isRetryable = error.name !== 'AbortError' && !error.message.includes('client error');

                if (attempt >= maxRetries || !isRetryable) {
                    if (isNode) {
                        try {
                            const fs = await import('fs');
                            fs.appendFileSync('embedding_debug.log', `‼ Final Error: ${error.message}\n`);
                        } catch (e) { }
                    }

                    // NUEVO: Emitir evento de fin con error para batch
                    pipelineEventBus.emit('embedding:end', {
                        ...eventPayload,
                        success: false,
                        error: error.message
                    });

                    if (error.name === 'AbortError') {
                        throw new Error('Batch embedding request timeout');
                    }
                    throw error;
                }

                const delay = Math.pow(2, attempt - 1) * baseDelay + (Math.random() * 500);
                this.logger.warn(`Retry ${attempt}/${maxRetries} after ${Math.round(delay)}ms: ${error.message}`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    /**
     * Get the embedding API endpoint
     * @returns {string} Endpoint URL
     */
    getEmbeddingEndpoint() {
        const _window = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global.window : {});

        if (_window?.AI_CONFIG?.embeddingEndpoint) {
            return _window.AI_CONFIG.embeddingEndpoint;
        }

        if (_window?.AI_CONFIG?.endpoint) {
            return _window.AI_CONFIG.endpoint.replace('/chat/completions', '/embeddings');
        }

        return 'http://127.0.0.1:8001/v1/embeddings';
    }

    /**
     * Generate a cache key for text
     * @param {string} text - Text to generate key for
     * @returns {string} Cache key
     */
    generateCacheKey(text) {
        // Simple hash for cache key
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Set cache entry with size management
     * @param {string} key - Cache key
     * @param {Array<number>} embedding - Embedding vector
     */
    setCache(key, embedding) {
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry (simple FIFO)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, embedding);
    }

    /**
     * Check if running in tracer/mock mode
     * @returns {boolean} Whether in tracer mode
     */
    isTracerMode() {
        return typeof window !== 'undefined' && window.IS_TRACER;
    }

    /**
     * Get mock embedding for tracer mode
     * @param {string} text - Text (unused in mock)
     * @returns {Array<number>} Mock embedding vector
     */
    getMockEmbedding(text) {
        // Return deterministic mock embedding based on text length
        const seed = text.length % 10;
        return new Array(768).fill(0).map((_, i) => (seed + i * 0.01) % 2 - 1);
    }

    /**
     * Get fallback embedding when API fails
     * @param {string} text - Text to generate fallback for
     * @returns {Array<number>} Fallback embedding vector
     */
    getFallbackEmbedding(text) {
        // Generate deterministic fallback based on text content
        const hash = this.generateCacheKey(text);
        const seed = parseInt(hash) || 0;

        // Create a 768-dimensional vector with pseudo-random but deterministic values
        const embedding = [];
        for (let i = 0; i < 768; i++) {
            // Use a simple linear congruential generator
            const value = (seed + i) * 9301 + 49297;
            embedding.push((value % 2000) / 1000 - 1); // Normalize to [-1, 1]
        }

        return embedding;
    }

    /**
     * Clear the embedding cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hitRate: 0 // Could be implemented with hit/miss counters
        };
    }

    /**
     * Preload embeddings for common texts
     * @param {Array<string>} commonTexts - Texts to preload
     * @returns {Promise<void>}
     */
    async preloadEmbeddings(commonTexts) {
        if (!Array.isArray(commonTexts)) return;

        const promises = commonTexts.slice(0, 10).map(text => this.getEmbedding(text));
        await Promise.allSettled(promises);
    }

    /**
     * Get embedding similarity (cosine similarity)
     * @param {Array<number>} embedding1 - First embedding
     * @param {Array<number>} embedding2 - Second embedding
     * @returns {number} Similarity score between 0 and 1
     */
    static getSimilarity(embedding1, embedding2) {
        if (!Array.isArray(embedding1) || !Array.isArray(embedding2) ||
            embedding1.length !== embedding2.length) {
            return 0;
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);

        if (norm1 === 0 || norm2 === 0) return 0;

        return dotProduct / (norm1 * norm2);
    }
}
