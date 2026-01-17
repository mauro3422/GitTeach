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

export class EmbeddingService {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 100;
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

        // Use tracer mock if in tracer mode
        if (this.isTracerMode()) {
            return this.getMockEmbedding(text);
        }

        try {
            const embedding = await this.callEmbeddingAPI(text);

            // Cache the result
            this.setCache(cacheKey, embedding);

            return embedding;
        } catch (error) {
            console.warn("[EmbeddingService] Embedding generation failed:", error.message);
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

        // Tracer Mode Support for Batching
        if (this.isTracerMode()) {
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
                console.warn("[EmbeddingService] Batch embedding failed:", error.message);

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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const payload = {
                model: "lfm2.5",
                input: text
            };

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
            if (data && data.data && data.data.length > 0 && data.data[0].embedding) {
                return data.data[0].embedding;
            }

            throw new Error('Invalid embedding response format');
        } catch (error) {
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
        const ENDPOINT = this.getEmbeddingEndpoint();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for batch

        try {
            const payload = {
                model: "lfm2.5",
                input: texts
            };

            const response = await fetch(ENDPOINT, {
                signal: controller.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Batch embedding API error: ${response.status}`);
            }

            const data = await response.json();
            if (data && data.data && Array.isArray(data.data)) {
                return data.data.map(item => item.embedding).filter(emb => emb);
            }

            throw new Error('Invalid batch embedding response format');
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Batch embedding request timeout');
            }
            throw error;
        }
    }

    /**
     * Get the embedding API endpoint
     * @returns {string} Endpoint URL
     */
    getEmbeddingEndpoint() {
        if (typeof window !== 'undefined' && window.AI_CONFIG?.embeddingEndpoint) {
            return window.AI_CONFIG.embeddingEndpoint;
        }

        if (typeof window !== 'undefined' && window.AI_CONFIG?.endpoint) {
            return window.AI_CONFIG.endpoint.replace('/chat/completions', '/embeddings');
        }

        return 'http://localhost:8000/v1/embeddings';
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