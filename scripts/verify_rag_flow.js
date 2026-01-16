/**
 * RAG Flow Tracer - Verifies:
 * 1. User Input -> IntentRouter
 * 2. IntentRouter -> QueryMemoryTool
 * 3. QueryMemoryTool -> MemoryAgent (Vector Search)
 * 4. MemoryAgent -> Context Injection
 * 
 * Run with: node scripts/verify_rag_flow.js
 */

import { IntentRouter } from '../src/renderer/js/services/ai/IntentRouter.js';
import { ToolRegistry } from '../src/renderer/js/services/toolRegistry.js';
import { MemoryAgent } from '../src/renderer/js/services/memory/MemoryAgent.js';

// MOCK ENVIRONMENT (Minimal for Node.js)
if (typeof window === 'undefined') {
    global.window = {
        AI_CONFIG: {
            endpoint: 'http://localhost:8000/v1/chat/completions',
            embeddingEndpoint: 'http://localhost:8001/v1/embeddings'
        },
        cacheAPI: {
            getDeveloperDNA: async () => ({ bio: "Dev experto en JS", traits: [] }),
            getStats: async () => ({ fileCount: 100, repoCount: 5 }),
            getTechnicalIdentity: async () => ({ bio: "Dev Identity", traits: [] })
        },
        // Mock githubAPI to prevent optional chaining errors if any
        githubAPI: {
            logToTerminal: (msg) => console.log(`[TERMINAL] ${msg}`)
        }
    };
}

// NOTE: Using REAL AIService with Node 22 native fetch.

async function runTracer() {
    console.log("🧬 RAG FLOW TRACER & REASONING CHECK STARTING...\n");

    const userInputs = [
        "Generame un README para mi perfil",
        "¿Cómo funciona la base de datos?",
        "Escribe una bio basada en mi código"
    ];

    for (const input of userInputs) {
        console.log(`\n🔹 TESTING INPUT: "${input}"`);

        // 1. ROUTER TEST
        try {
            const intent = await IntentRouter.route(input, "SESSION_CONTEXT", AIService.callAI);
            console.log(`   👉 Discovered Intent: ${intent}`);

            if (intent === 'query_memory') {
                console.log("   ✅ SUCCESS: Router correctly identified memory need.");

                // 2. TOOL EXECUTION TEST
                const tool = ToolRegistry.getById('query_memory');
                console.log(`   👉 Executing Tool: ${tool.name}`);

                // Mock MemoryAgent.search to avoid real vector server dependency for this quick test
                // (We already verified vectors in simulate_vector_search.mjs)
                const originalRetrieve = MemoryAgent.prototype.retrieveContext;
                MemoryAgent.prototype.retrieveContext = async (q) => `[MOCK MEMORY] Found info on ${q}`;

                const result = await tool.execute({ query: input }, "mauro");

                if (result.success && result.systemContext) {
                    console.log("   ✅ SUCCESS: Tool returned 'systemContext'.");
                    console.log(`   📄 Context Sample: "${result.systemContext}"`);
                } else {
                    console.error("   ❌ FAILURE: Tool did not return systemContext.", result);
                }

                // Restore
                MemoryAgent.prototype.retrieveContext = originalRetrieve;

            } else {
                console.warn(`   ⚠️ WARNING: Router chose '${intent}' instead of 'query_memory'.`);
            }

        } catch (e) {
            console.error("   ❌ ERROR:", e);
        }
    }
}

runTracer();
