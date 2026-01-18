/**
 * ContextManager - Manages AI session context (Base Identity + RAG Technical Memory)
 * Extracted from AIService to comply with SRP
 *
 * SOLID Principles:
 * - S: Only manages context state and truncation logic
 * - O: Extensible context types
 * - L: N/A
 * - I: Clean interface for context operations
 * - D: No dependencies on other services
 */

export class ContextManager {
    constructor() {
        this.baseContext = ""; // Persistent DNA/Identity
        this.ragContext = "";  // Ephemeral Query Context
        this.currentSessionContext = "";
        this._hasLoggedTruncation = false;
    }

    /**
     * Set the base context (persistent identity)
     */
    setBaseContext(context) {
        this.baseContext = context;
        this.rebuildContext();
    }

    /**
     * Inject RAG context (ephemeral technical memory)
     */
    injectRAGContext(contextBlock) {
        this.ragContext = contextBlock;
        this.rebuildContext();
    }

    /**
     * Clear RAG context
     */
    clearRAGContext() {
        if (this.ragContext) {
            this.ragContext = "";
            this.rebuildContext();
        }
    }

    /**
     * Rebuild the session context with intelligent truncation
     */
    rebuildContext() {
        const MAX_CHARS = 32000;
        const MIN_BASE_RESERVE = 8000; // Protect at least 8k for critical instructions/identity

        let base = this.baseContext || "";
        let rag = this.ragContext || "";

        // Non-destructive truncation logic
        if ((base.length + rag.length) > MAX_CHARS) {
            if (!this._hasLoggedTruncation) {
                console.warn('[ContextManager] Context too large, applying non-destructive truncation...');
                this._hasLoggedTruncation = true;
            }

            // 1. Prioritize RAG truncation (Ephemeral technical memory)
            // We keep the TAIL of the RAG as it's usually the most recent investigation
            const availableForRag = Math.max(0, MAX_CHARS - Math.max(base.length, MIN_BASE_RESERVE));
            if (rag.length > availableForRag) {
                rag = "--- [TRUNCATED RAG] ---\n" + rag.substring(rag.length - availableForRag);
            }

            // 2. If still too big, truncate BASE protecting the HEAD (Instructions/Role)
            if ((base.length + rag.length) > MAX_CHARS) {
                const availableForBase = MAX_CHARS - rag.length - 100;
                base = base.substring(0, availableForBase) + "\n... [Identity Truncated]";
            }
        } else {
            this._hasLoggedTruncation = false; // Reset flag when not truncating
        }

        this.currentSessionContext = rag ? `${base}\n\n### RELEVANT TECHNICAL MEMORY (RAG):\n${rag}` : base;
    }

    /**
     * Get the current session context
     */
    getCurrentContext() {
        return this.currentSessionContext;
    }

    /**
     * Get context statistics
     */
    getStats() {
        return {
            baseLength: this.baseContext.length,
            ragLength: this.ragContext.length,
            totalLength: this.currentSessionContext.length,
            isTruncated: this._hasLoggedTruncation
        };
    }
}
