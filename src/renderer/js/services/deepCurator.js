/**
 * DeepCurator - Deep Curation Engine (Map-Reduce) and AI Insights
 * Extracted from ProfileAnalyzer to comply with SRP
 * UPDATED: Uses centralized Logger
 */
import { AIService } from './aiService.js';
import { Logger } from '../utils/logger.js';

export class DeepCurator {
    /**
     * Deep Curation Engine (Map-Reduce):
     * Takes 100% of summaries and reduces them to dense memory.
     */
    async runDeepCurator(username, coordinator) {
        const allSummariesString = coordinator.getAllSummaries();
        const allSummaries = allSummariesString.split('\n').filter(s => s.trim().length > 0);

        // --- PHASE 1: THEMATIC MAPPING (Parallel) ---
        Logger.mapper('Starting 3 specialized analysis layers...');

        const thematicPrompts = {
            architecture: `You are the SOFTWARE ARCHITECT. Analyze these 40 files and extract:
                1. Design patterns (DI, Factory, Singleton, etc).
                2. SOLID compliance level.
                3. Folder structure and modularity.
                Technical and concise response.`,

            habits: `You are the CODE MENTOR. Analyze these 40 files and extract:
                1. Naming consistency (variables/functions).
                2. Error handling and edge cases.
                3. Comment quality and readability.
                Technical and concise response.`,

            stack: `You are the STACK EXPERT. Analyze these 40 files and extract:
                1. Advanced framework/library usage.
                2. Performance and concurrency optimizations.
                3. Dependency and external API handling.
                Technical and concise response.`
        };

        const thematicAnalyses = await Promise.all(Object.entries(thematicPrompts).map(async ([key, systemPrompt]) => {
            // Priority-based sampling instead of random
            const priorityFiles = allSummaries
                .filter(s => s.includes('main.') || s.includes('index.') || s.includes('app.') || s.includes('config'))
                .slice(0, 15);
            const otherFiles = allSummaries
                .filter(s => !priorityFiles.includes(s))
                .slice(0, 25);
            const batchSample = [...priorityFiles, ...otherFiles].join('\n');

            try {
                return await AIService.callAI(`Mapper:${key}`, `${systemPrompt}\n\nFILES:\n${batchSample}`, 0.1);
            } catch (e) {
                return `Error in mapper ${key}`;
            }
        }));

        // --- PHASE 2: REDUCE (Synthesize Developer DNA) ---
        Logger.reducer('Synthesizing Developer DNA...');

        const reducePrompt = `YOU ARE THE TECHNICAL INTELLIGENCE REDUCER. You have results from 3 specialized mappers on ${username}'s code.
        
        EVIDENCE:
        ARCHITECTURE: ${thematicAnalyses[0]}
        HABITS: ${thematicAnalyses[1]}
        STACK & PERFORMANCE: ${thematicAnalyses[2]}
        
        YOUR MISSION: Generate the "DEVELOPER DNA" structuring findings REALISTICALLY and TECHNICALLY.
        
        GOLDEN RULES:
        1. DO NOT INVENT PROJECT NAMES (e.g., Don't say "Project X" if not in the code).
        2. DO NOT USE TERMS LIKE "Maximum" or "Gravity" unless they are real constants from the code.
        3. Maintain professional tone 100% based on mapper evidence.
        
        RESPOND ONLY WITH VALID JSON IN THIS FORMAT:
        {
          "bio": "3-4 sentence narrative summary highlighting unique strengths.",
          "traits": [
            { "name": "Architecture", "score": 0-100, "details": "Brief detail of detected pattern" },
            { "name": "Habits", "score": 0-100, "details": "Brief detail on quality/naming" },
            { "name": "Technology", "score": 0-100, "details": "Brief detail on stack/performance" }
          ],
          "verdict": "Senior/Mid/Junior + Specialty"
        }`;

        const rawResponse = await AIService.callAI("Reducer DNA", reducePrompt, 0.1);

        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            const dna = JSON.parse(jsonMatch[0]);
            return dna;
        } catch (e) {
            console.warn("Error parsing DNA JSON, returning raw", e);
            return { bio: rawResponse, traits: [], verdict: "Analyzed" };
        }
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
            const structuredFindings = codeInsights.map(f => {
                const files = f.auditedSnippets && f.auditedSnippets !== "No Access"
                    ? f.auditedSnippets.map(s => `- ${s.file}: ${s.aiSummary || "Analyzed"}`).join('\n')
                    : "Files analyzed without specific summary.";
                return `### REPO: ${f.repo}\n${files}`;
            }).join('\n\n');

            prompt = `You are an ELITE TECHNICAL CURATOR. Your goal is to transform Worker-analyzed code into an IMPACT PROFILE for ${username}.
            
            RAW DATA BY REPOSITORY (STRICTLY TRUTHFUL):
            ${structuredFindings}
            
            CURATION INSTRUCTIONS:
            1. **TECHNICAL IDENTITY**: Based on all repositories, define the developer's essence.
            2. **FORENSIC EVIDENCE (CRITICAL)**: DON'T use empty phrases. If you say they know Python, cite the file where you saw it.
            3. **DETECT REAL PROJECTS**: Separate school assignments from real Game Engines or libraries.

            FORMAT RULES (JSON ONLY):
            {
              "bio": "3-4 sentence narrative summary highlighting unique strengths.",
              "traits": [
                { "name": "Architecture", "score": 0-100, "details": "Brief detail of detected pattern" },
                { "name": "Habits", "score": 0-100, "details": "Brief detail on quality/naming" },
                { "name": "Technology", "score": 0-100, "details": "Brief detail on stack/performance" }
              ],
              "key_evidences": [
                 { "file": "path/to/file", "snippet": "Brief code fragment", "insight": "Why this demonstrates skill" }
              ],
              "verdict": "Senior/Mid/Junior + Specialty"
            }
            
            Always respond based ONLY on mapper data.`;
        }

        try {
            const response = await AIService.callAI("Eres un analista de perfiles GitHub experto.", prompt, 0.3);

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn("[getAIInsights] Sin JSON, usando respuesta como summary.");
                return {
                    summary: response.substring(0, 500),
                    suggestions: ['github_stats']
                };
            }

            const cleanJson = jsonMatch[0];
            const data = JSON.parse(cleanJson);

            const summary = data.summary || data.bio || "Perfil analizado.";
            const suggestions = data.suggestions || ['github_stats', 'skills_grid'];

            return { summary, suggestions };
        } catch (e) {
            console.warn("AI Insight Fallback Error:", e);
            return {
                summary: `Desarrollador enfocado en ${langs[0] || 'software'}.`,
                suggestions: ['github_stats', 'top_langs']
            };
        }
    }

    /**
     * Generates a dense technical summary ("With Substance") using local AI.
     */
    async generateHighFidelitySummary(repo, path, usageSnippet) {
        const systemPrompt = `You are an ELITE TECHNICAL ANALYST.
Your mission is to identify the PURPOSE and QUALITY of analyzed code for building a professional profile.

ANALYSIS OBJECTIVES:
1. IDENTIFY DOMAIN: What is this? (Business Logic, UI, Script, Configuration, Game Engine, Data Analysis, etc.).
2. DETECT PATTERNS: What structures are used? (Singleton, Factory, Recursion, Async/Await, Error Handling).
3. EVALUATE COMPLEXITY: Is it boilerplate code or does it demonstrate real engineering?
4. EXTRACT EVIDENCE: Cite the key function or variable that demonstrates the skill.

DON'T OVER-INTERPRET. If it's a simple config file, say so.
If it's a complex algorithm, highlight it.

RESPONSE FORMAT (Plain text, 1 dense line):
[DOMAIN] <Technical Description> | Evidence: <Key_Fragment>`;

        const userPrompt = `Analyze this file from ${repo}: ${path}
\`\`\`
${usageSnippet.substring(0, 1000)}
\`\`\`
Tell me what it demonstrates about the developer:`;

        try {
            return await AIService.callAI(systemPrompt, userPrompt, 0.1);
        } catch (e) {
            return `Analysis failed: ${e.message}`;
        }
    }
}
