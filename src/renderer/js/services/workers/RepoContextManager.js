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
        ctx.recentFindings.push({ path: filePath, summary: cleanSummary });

        // Adaptive Compaction: If we have enough recent findings, merge them into Golden Knowledge
        if (ctx.recentFindings.length >= 10 && !ctx.compactionInProgress) {
            this.runCompaction(repoName, aiService);
        }
    }

    /**
     * Internal: Run compaction without blocking the worker
     */
    async runCompaction(repoName, aiService) {
        const ctx = this.repoContexts.get(repoName);
        ctx.compactionInProgress = true;

        try {
            Logger.worker('POOL', `[${repoName}] Compacting technical memory (${ctx.recentFindings.length} files)...`);

            const systemPrompt = `You are a TECHNICAL KNOWLEDGE SYNTHESIZER. 
Your goal is to merge current knowledge with new findings into a single, DENSE Technical Profile.
Preserve architectural patterns, key file roles, and technical evidence.`;

            const userPrompt = `REPO: ${repoName}
            EXISTING GOLDEN KNOWLEDGE:
            ${ctx.goldenKnowledge || 'None yet.'}

            NEW DISCOVERIES TO MERGE:
            ${ctx.recentFindings.map(f => `- ${f.path}: ${f.summary}`).join('\n')}

            Synthesize into a short, DENSE paragraph (Max 120 words) representing the accumulated architectural understanding:`;

            const compacted = await aiService.callAI(systemPrompt, userPrompt, 0.1);

            // Atomically update
            ctx.goldenKnowledge = compacted;
            ctx.recentFindings = [];
            Logger.worker('POOL', `[${repoName}] Knowledge compacted successfully ✅`);
        } catch (e) {
            console.warn(`[Compaction Error] ${repoName}:`, e);
        } finally {
            ctx.compactionInProgress = false;
        }
    }

    /**
     * Clear context for a specific repo (used on context switch)
     */
    clearRepoContext(repoName) {
        if (this.repoContexts.has(repoName)) {
            const ctx = this.repoContexts.get(repoName);
            ctx.recentFindings = [];
        }
    }

    /**
     * Clear all contexts
     */
    clear() {
        this.repoContexts.clear();
    }
}
