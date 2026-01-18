/**
 * InsightGenerator - Generates AI-powered insights and summaries
 * Extracted from DeepCurator to comply with SRP
 *
 * SOLID Principles:
 * - S: Only generates insights and summaries
 * - O: Extensible to new insight generation strategies
 * - L: N/A
 * - I: Clean interface for insight operations
 * - D: Depends on AIService for AI calls
 */

import { AIService } from '../aiService.js';
import { SynthesisPrompts } from '../../prompts/curator/SynthesisPrompts.js';

export class InsightGenerator {
    constructor() {
        // No dependencies in constructor for flexibility
    }

    /**
     * Generates AI insights based on scan findings
     */
    async getAIInsights(username, langs, codeInsights, hasRealData) {
        let prompt = "";

        const isRateLimited = codeInsights && codeInsights.some(f => f.error === "Rate Limit");

        if (isRateLimited) {
            prompt = `IMPORTANT NOTICE! The system has reached GitHub's Rate Limit.
            Explain honestly to the user that Workers have been temporarily blocked by GitHub.
            Tell them you cannot analyze real code at this moment to avoid hallucinations.
            Suggest waiting a few minutes or using a Personal Access Token if available.
            Generate a JSON with this format:
            { "summary": "GitHub API rate limit temporarily reached.", "suggestions": ["github_stats"] }`;
        } else if (!hasRealData) {
            prompt = `ATTENTION! I couldn't access the real code from ${username}'s repositories (Connection or permission errors).
            Honestly tell the user that you analyzed their repository and language list (${langs.join(', ')}),
            but couldn't "dive" into their code for a deep audit.
            Ask if they have the GitHub token configured correctly.
            Generate a JSON with this format:
            { "summary": "Couldn't analyze your code deeply due to lack of access.", "suggestions": ["github_stats"] }`;
        } else {
            // OPTIMIZATION: Use TaskDivider to batch or summarize findings if too many
            const maxVisibleRepos = 10;
            const topInsights = codeInsights.slice(0, maxVisibleRepos);
            const remainingCount = codeInsights.length - maxVisibleRepos;

            const structuredFindings = topInsights.map(f => {
                const files = f.auditedSnippets && f.auditedSnippets !== "No Access"
                    ? f.auditedSnippets.slice(0, 5).map(s => `- ${s.file}: ${s.aiSummary || "Analyzed"}`).join('\n')
                    : "Files analyzed without specific summary.";
                return `### REPO: ${f.repo}\n${files}`;
            }).join('\n\n');

            const additionalContext = remainingCount > 0
                ? `\n\n[NOTE] ${remainingCount} additional repositories were analyzed but omitted for context efficiency.`
                : "";

            prompt = `${SynthesisPrompts.CURATOR_IDENTITY_PROMPT}

            USER: ${username}
            RAW DATA BY REPOSITORY (STRICTLY TRUTHFUL):
            ${structuredFindings}
            ${additionalContext}`;
        }

        try {
            const response = await AIService.callAI("You are an expert GitHub profile analyst.", prompt, 0.3);

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn("[getAIInsights] No JSON found, using response as summary.");
                return {
                    summary: response.substring(0, 500),
                    suggestions: ['github_stats']
                };
            }

            const cleanJson = jsonMatch[0];
            const data = JSON.parse(cleanJson);

            const summary = data.summary || data.bio || "Profile analyzed.";
            const suggestions = data.suggestions || ['github_stats', 'skills_grid'];

            return { summary, suggestions };
        } catch (e) {
            console.warn("AI Insight Fallback Error:", e);
            return {
                summary: `Developer focused on ${langs[0] || 'software'}.`,
                suggestions: ['github_stats', 'top_langs']
            };
        }
    }

    /**
     * Generates a dense technical summary using local AI.
     */
    async generateHighFidelitySummary(repo, path, usageSnippet, priority = 'BACKGROUND') {
        // Delegate to the specialized PromptBuilder logic even if used in isolation
        const { WorkerPromptBuilder } = await import('../workers/WorkerPromptBuilder.js');
        const builder = new WorkerPromptBuilder();
        const systemPrompt = builder.buildSystemPrompt();
        const { prompt: userPrompt } = builder.buildUserPrompt({ repo, path, content: usageSnippet });

        try {
            return await AIService.callAI(systemPrompt, userPrompt, 0.1, null, null, priority);
        } catch (e) {
            return `Analysis failed: ${e.message}`;
        }
    }

    /**
     * Build streaming context for analysis
     */
    async buildStreamingContext() {
        // This would build context from accumulated findings
        // Simplified implementation
        return {
            findings: [],
            context: "Streaming context for analysis"
        };
    }
}
