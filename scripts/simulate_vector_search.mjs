/**
 * Simulation Script: Vector Search Verification
 * 
 * Objectives:
 * 1. Mock the MemoryManager with sample nodes.
 * 2. Force-feed embeddings (mocked or real if server is up).
 * 3. Run MemoryAgent.search() and verify ranking.
 */

import { MemoryAgent } from '../src/renderer/js/services/memory/MemoryAgent.js';
import { memoryManager } from '../src/renderer/js/services/memory/MemoryManager.js';
import { AIService } from '../src/renderer/js/services/aiService.js';

// Setup Mock Environment
global.window = {
    AI_CONFIG: {
        endpoint: 'http://localhost:8000/v1/chat/completions',
        embeddingEndpoint: 'http://localhost:8001/v1/embeddings'
    }
};

// Mock AIService.getEmbedding to avoid dependency on real server if offline
// But we want to test REAL server if possible. 
// We will try real first, if fails, mock it.

const originalGetEmbedding = AIService.getEmbedding;
AIService.getEmbedding = async (text) => {
    try {
        console.log(`[SIM] Requesting embedding for: "${text.substring(0, 20)}..."`);
        const result = await originalGetEmbedding.call(AIService, text);
        if (result) {
            console.log(`[SIM] ✅ Got real embedding (dim: ${result.length})`);
            return result;
        }
        throw new Error("No result");
    } catch (e) {
        console.warn(`[SIM] ⚠️ Server/Embedding Error: ${e.message}`);
        // Deterministic Mock for "database" to match "database"
        // Simple hash-to-vector to verify sorting logic works even without AI
        const seed = text.length + text.charCodeAt(0);
        return Array(384).fill(0).map((_, i) => Math.cos(seed * i));
    }
};

async function runSimulation() {
    console.log("=== VECTOR MEMORY SIMULATION ===");

    // 1. Create Sample Memories
    console.log("1. Seeding Memory...");
    const samples = [
        { repo: 'TestRepo', path: 'auth.js', insight: 'Implements OAuth2 authentication flow using JWT tokens.', evidence: 'jwt.sign()', classification: 'Security', confidence: 0.9, complexity: 3 },
        { repo: 'TestRepo', path: 'utils.js', insight: 'Helper functions for date formatting.', evidence: 'moment.js', classification: 'Utility', confidence: 0.5, complexity: 1 },
        { repo: 'TestRepo', path: 'database.py', insight: 'Handles PostgreSQL connection pool and query execution.', evidence: 'psycopg2.pool', classification: 'Backend', confidence: 0.8, complexity: 4 },
        { repo: 'GameEngine', path: 'render.cpp', insight: 'Vulkan rendering pipeline initialization.', evidence: 'vkCreateInstance', classification: 'Game Engine', confidence: 0.95, complexity: 5 }
    ];

    for (const s of samples) {
        const node = memoryManager.storeFinding(s);
        await memoryManager.indexNode(node); // This triggers embedding generation
    }

    // Give a moment for async indexNode to complete (though we awaited it, getEmbedding is async)

    // 2. Perform Search
    console.log("\n2. Executing Search: Query = 'database connection'");
    const results = await new MemoryAgent().search('database connection', 3);

    console.log("\n=== SEARCH RESULTS ===");
    results.forEach((hit, i) => {
        console.log(`#${i + 1} [Score: ${hit.score.toFixed(4)}] ${hit.node.repo}/${hit.node.path}`);
    });

    // 3. Validation
    const topHit = results[0];
    if (topHit && topHit.node.path === 'database.py') {
        console.log("\n✅ SUCCESS: Vector Search correctly identified the database node.");
    } else {
        console.log("\n❌ ALLOCATION: Expected 'database.py' to be top result.");
    }
}

runSimulation();
