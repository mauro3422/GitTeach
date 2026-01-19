/**
 * RepoContextManager - Manages cumulative context for repositories
 * Extracted from AIWorkerPool to comply with SRP
 * 
 * Responsibilities:
 * - Track summaries per repo for cumulative context
 * - Handle Golden Knowledge compaction
 * - Manage recent findings buffer
 */
import { Logger } from '../../utils/logger.js';
import { AIService } from '../aiService.js';

export class RepoContextManager {
    constructor() {
        this.repoContexts = new Map();
    }

    /**
     * Get cumulative context for a repo (Golden Knowledge + Recent Findings)
     */
    getRepoContext(repoName) {
        const ctx = this.repoContexts.get(repoName);
        if (!ctx) return '';

        let context = '';
        if (ctx.goldenKnowledge) {
            context += `[GOLDEN KNOWLEDGE BASE (PREVIOUSLY COMPACTED)]:\n${ctx.goldenKnowledge}\n\n`;
        }

        if (ctx.recentFindings.length > 0) {
            context += `[RECENT DISCOVERIES]:\n`;
            context += ctx.recentFindings.map(f => `- ${f.path}: ${f.summary}`).join('\n');
        }

        return context;
    }

    /**
     * Add file summary to repo context and trigger compaction if needed
     */
    async addToRepoContext(repoName, filePath, summary, aiService) {
        if (!this.repoContexts.has(repoName)) {
            this.repoContexts.set(repoName, {
                goldenKnowledge: '',
                recentFindings: [],
                compactionInProgress: false
            });
        }

        const ctx = this.repoContexts.get(repoName);
        // Keep slightly more descriptive summary for compaction (max 150 chars)
        const cleanSummary = summary.split('\n')[0].substring(0, 150);

        // Anti-Memory Leak: Limit buffer size
        const MAX_RECENT = 50;
        if (ctx.recentFindings.length >= MAX_RECENT) {
            ctx.recentFindings.shift(); // Remove oldest
        }

        ctx.recentFindings.push({ path: filePath, summary: cleanSummary });

        // Adaptive Compaction: If we have enough recent findings, merge them into Golden Knowledge
        if (ctx.recentFindings.length >= 10 && !ctx.compactionInProgress) {
            this.runCompaction(repoName);
        }
    }

    /**
     * Internal: Run compaction without blocking the worker (Now on CPU)
     * ENHANCED: Now extracts coherence/health metrics and persists to disk
     */
    async runCompaction(repoName) {
        const ctx = this.repoContexts.get(repoName);
        ctx.compactionInProgress = true;

        // Non-blocking: yield to event loop
        setTimeout(async () => {
            try {
                Logger.worker('POOL', `[${repoName}] Compacting technical memory on CPU (${ctx.recentFindings.length} files)...`);

                const systemPrompt = `You are a Repository Knowledge Curator. Your job is to:
1. MERGE new discoveries into the existing knowledge base
2. EVALUATE the coherence and health of the codebase
3. Return a structured JSON with the synthesis AND metrics

Output JSON format:
{
    "synthesis": "Dense paragraph (max 150 words) summarizing the accumulated architectural understanding",
    "project_type": "e.g., API, CLI, Library, Web App, etc.",
    "coherence_score": 1-10 (how well the codebase hangs together architecturally),
    "health_indicators": {
        "has_tests": true/false,
        "has_docs": true/false,
        "has_config": true/false,
        "modular": true/false
    },
    "dominant_patterns": ["Pattern1", "Pattern2"],
    "tech_stack_signals": ["Tech1", "Tech2"]
}`;

                const userPrompt = `REPO: ${repoName}

EXISTING GOLDEN KNOWLEDGE:
${ctx.goldenKnowledge || 'None yet (first compaction).'}

NEW DISCOVERIES TO MERGE (${ctx.recentFindings.length} files):
${ctx.recentFindings.map(f => `- ${f.path}: ${f.summary}`).join('\n')}

Synthesize and evaluate:`;

                // Use CPU server to avoid blocking GPU workers
                let response;
                let compactionAttempt = 0;
                const maxCompactionRetries = 2;

                while (compactionAttempt < maxCompactionRetries) {
                    try {
                        response = await AIService.callAI_CPU(systemPrompt, userPrompt, 0.2, 'json_object');
                        if (response) break;
                    } catch (e) {
                        compactionAttempt++;
                        if (compactionAttempt >= maxCompactionRetries) throw e;
                        await new Promise(r => setTimeout(r, 5000)); // Wait 5s between compaction retries
                    }
                }

                let compactionResult;
                try {
                    // Try robust parsing first if available at some point, or just JSON.parse
                    compactionResult = JSON.parse(response);
                } catch (e) {
                    // Fallback to text synthesis if JSON fails
                    compactionResult = {
                        synthesis: typeof response === 'string' ? response.substring(0, 1000) : "Synthesis failed",
                        coherence_score: 5,
                        health_indicators: { has_tests: false, has_docs: true, has_config: true, modular: true }
                    };
                }

                // Atomically update
                ctx.goldenKnowledge = compactionResult.synthesis || response;

                // TICKS: Increment compaction tick in StreamingHandler if available
                if (typeof window !== 'undefined' && window.deepCurator?.streamingHandler) {
                    window.deepCurator.streamingHandler.incrementTick('compaction');
                }

                ctx.compactionMetrics = {
                    project_type: compactionResult.project_type,
                    coherence_score: compactionResult.coherence_score,
                    health_indicators: compactionResult.health_indicators,
                    dominant_patterns: compactionResult.dominant_patterns,
                    tech_stack_signals: compactionResult.tech_stack_signals,
                    files_compacted: ctx.recentFindings.length,
                    last_updated: new Date().toISOString()
                };
                ctx.recentFindings = [];

                // PERSIST to disk for traceability
                await this._persistGoldenKnowledge(repoName, ctx);

                Logger.worker('POOL', `[${repoName}] Knowledge compacted ✅ (Coherence: ${compactionResult.coherence_score}/10)`);
            } catch (e) {
                console.warn(`[Compaction Error] ${repoName}:`, e);
            } finally {
                ctx.compactionInProgress = false;
            }
        }, 0);
    }

    /**
     * Persist golden knowledge to disk for traceability
     */
    async _persistGoldenKnowledge(repoName, ctx) {
        try {
            if (typeof window !== 'undefined' && window.cacheAPI?.persistRepoGoldenKnowledge) {
                await window.cacheAPI.persistRepoGoldenKnowledge(repoName, {
                    goldenKnowledge: ctx.goldenKnowledge,
                    metrics: ctx.compactionMetrics,
                    timestamp: new Date().toISOString()
                });
                Logger.worker('POOL', `[${repoName}] Golden knowledge persisted to disk`);
            }
        } catch (e) {
            Logger.warn('RepoContextManager', `Failed to persist golden knowledge: ${e.message}`);
        }
    }

    /**
     * Clear context for a specific repo (used on context switch)
     */
    clearRepoContext(repoName) {
        if (this.repoContexts.has(repoName)) {
            const ctx = this.repoContexts.get(repoName);
            ctx.recentFindings = [];
            ctx.goldenKnowledge = ''; // DEEP PURGE: Prevent domain leakage
        }
    }

    /**
     * Clear all contexts
     */
    clear() {
        this.repoContexts.clear();
    }
}
