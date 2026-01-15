/**
 * DeepCurator - Deep Curation Engine (Map-Reduce) and AI Insights
 * Extracted from ProfileAnalyzer to comply with SRP
 * UPDATED: Uses centralized Logger
 */
import { AIService } from './aiService.js';
import { Logger } from '../utils/logger.js';
import { DebugLogger } from '../utils/debugLogger.js';

export class DeepCurator {
    /**
     * Deep Curation Engine (Map-Reduce):
     * Takes 100% of summaries and reduces them to dense memory.
     * UPDATED: Now uses "Funnel of Truth" logic (Deduplication + Rarity Filter).
     */
    async runDeepCurator(username, coordinator) {
        // Step 1: Get Raw Rich Data (JSON Objects)
        const rawFindings = coordinator.getAllRichSummaries();

        if (!rawFindings || rawFindings.length === 0) {
            Logger.info('DeepCurator', 'No findings available for curation.');
            return null;
        }

        // Step 2: Curate (Deduplicate + Filter + Weighting + Referencing)
        const curationResult = this.curateInsights(rawFindings);
        const { validInsights, anomalies, stats, traceability_map } = curationResult;

        Logger.reducer(`Curación completada: ${rawFindings.length} -> ${validInsights.length} insights únicos.`);
        Logger.reducer(`Diversidad: ${stats.repoCount} repositorios, ${stats.topStrengths.slice(0, 3).map(s => s.name).join(', ')} predominantes.`);

        if (anomalies.length > 0) {
            Logger.warn('DeepCurator', `Detectadas ${anomalies.length} anomalías de integridad.`);
        }

        const validInsightsResponse = validInsights.map(i => {
            const anomalyPrefix = i.params.insight.includes('INTEGRITY ANOMALY') ? '[⚠️ INTEGRITY ANOMALY] ' : '';
            const weightPrefix = i.weight > 1 ? `[x${i.weight} CONFIRMED] ` : '';
            return `[${i.repo}/${i.file}]: ${weightPrefix}${anomalyPrefix}${i.params.insight} | Evidence: ${i.params.evidence || 'N/A'} (Strength: ${i.params.technical_strength})`;
        }).join('\n');

        // --- PHASE 1: THEMATIC MAPPING (Parallel) ---
        // We use the Curated List for the mapping to avoid noise.
        Logger.mapper('Ejecutando 3 capas de análisis técnico profundo...');

        const thematicPrompts = {
            architecture: `YOU ARE THE ELITE SYSTEM ARCHITECT. Your goal is to extract the ARCHITECTURAL DNA of ${username}.
            
            Analyze these CURATED file insights (with their real code EVIDENCE) and identify:
            1. RECURRING PATTERNS: Specific implementations (e.g., "Custom IPC Bridge", "Centralized State").
            2. DOMAIN SPECIALIZATION: Distinguish between Business Systems, Game Engines, and Science Simulations.
            3. STRUCTURAL RIGOR: Cite files that serve as "Anchors" (controllers, managers).
            
            STRICT RULE: Every claim MUST cite at least one file path and reference the provided evidence.`,

            habits: `YOU ARE THE SENIOR CODE QUALITY AUDITOR. Analyze these files and extract ${username}'s CODING HABITS:
            
            1. LANGUAGE INTEGRITY: If you see "INTEGRITY ANOMALY" tags, comment on the developer's language-switching or potential mismatch issues.
            2. ROBUSTNESS: How are edge cases handled in the evidence snippets?
            3. EVOLUTION: Can you see a shift from "Scripter" (single files) to "Architect" (modular systems)?
            
            STRICT RULE: Cite real file paths and code fragments for every habit detected.`,

            stack: `YOU ARE THE FULL-STACK PERFORMANCE EXPERT. Map the TECHNICAL STACK of ${username}:
            
            1. ADVANCED USAGE: Detect "Vulkan", "GPU acceleration", "Scientific formulas", "Medical data structures".
            2. PERFORMANCE: Cite optimizations like O(1) algorithms, caching, or parallelization found in evidence.
            3. TOOLING: Mention build scripts (e.g., ps1, yml) and automation.
            
            STRICT RULE: Be extremely technical. Use provided evidence snippets to back up your stack analysis.`
        };

        const thematicAnalyses = [];
        for (const [key, systemPrompt] of Object.entries(thematicPrompts)) {
            try {
                Logger.mapper(`Analizando capa: ${key}...`);
                const result = await AIService.callAI(`Curator Mapper: ${key}`, `${systemPrompt}\n\nCURATED INSIGHTS:\n${validInsightsResponse}`, 0.1);
                thematicAnalyses.push(result);
            } catch (e) {
                Logger.error('DeepCurator', `Error en mapper ${key}: ${e.message}`);
                thematicAnalyses.push(`Error in mapper ${key}: ${e.message}`);
            }
        }

        // Debug logging
        DebugLogger.logCurator('mapper_results', {
            architecture: thematicAnalyses[0],
            habits: thematicAnalyses[1],
            stack: thematicAnalyses[2],
            originalCount: rawFindings.length,
            curatedCount: validInsights.length,
            anomalies: anomalies,
            stats: stats
        });

        // --- PHASE 2: REDUCE (Synthesize Developer DNA) ---
        Logger.reducer('Sintetizando ADN de Desarrollador con ALTA FIDELIDAD...');

        const reducePrompt = `YOU ARE THE TECHNICAL INTELLIGENCE REDUCER. Synthesize the final DEVELOPER DNA of ${username}.
        
        SPECIALIST REPORTS:
        - ARCHITECTURE: ${thematicAnalyses[0]}
        - HABITS: ${thematicAnalyses[1]}
        - STACK & TECH: ${thematicAnalyses[2]}

        ANOMALIES DETECTED:
        ${anomalies.map(a => `- ${a.file}: ${a.params?.insight || 'Anomaly detected'}`).join('\n')}
        
        STATISTICAL EVIDENCE:
        - Repositories Analyzed: ${stats.repoCount}
        - Top Technical Patterns (by volume): ${stats.topStrengths.map(s => `${s.name} (${s.count} files)`).join(', ')}
        - Anomalies Detected: ${anomalies.length}

        REFINEMENT RULES:
        1. BIO: Write a real 5-sentence technical summary. DO NOT copy placeholders.
        2. TRAITS: Use actual scores (0-100) and cite real files from the reports.
        3. HEALTH: Mention if anomalies (like ObraSocialData.js) were found.

        STRICT SCHEMA RULE (Output ONLY valid JSON):
        {
          "bio": "A single, dense technical biography paragraph.",
          "traits": [
            { "name": "Architecture", "score": 85, "details": "Summary focusing on the weighted patterns.", "evidence": "file1, file2" }
          ],
          "signature_files": ["top_representative_file1", "top_representative_file2"],
          "code_health": { "integrity_score": 90, "anomalies_found": true, "details": "Detailed anomaly report if any." },
          "verdict": "A dynamic technical title (e.g., 'Senior Graphics Architect', 'Backend Security Specialist') based on findings."
        }
        
        INSTRUCTIONS:
        - DO NOT COPY the placeholder 'Developer Level + Specialization'. Generate a real title.
        - Base the 'score' on both depth of insights and 'statistical volume' from the evidence.
        - The 'details' MUST cite at least one confirmed pattern (from the statistical evidence above).
        - Signature files should be those that represent the developer's strongest patterns.`;

        const rawResponse = await AIService.callAI("Reducer Refiner", reducePrompt, 0.1);

        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            const dna = JSON.parse(jsonMatch[0]);

            // INJECT HIDDEN METADATA: Traceability Map
            // This is for future reference and won't clutter the initial chat response
            dna.traceability_map = traceability_map;

            // Debug logging
            DebugLogger.logCurator('final_dna_synthesis', dna);

            return dna;
        } catch (e) {
            console.warn("Error parsing DNA JSON, returning raw", e);
            const fallbackDna = { bio: rawResponse, traits: [], verdict: "Analyzed (Parsing Error)" };

            // Still inject metadata into fallback if possible
            fallbackDna.traceability_map = traceability_map;
            DebugLogger.logCurator('final_dna_synthesis', fallbackDna);

            return fallbackDna;
        }
    }

    /**
     * "The Funnel of Truth"
     * Filters, deduplicates, and ranks insights.
     */
    curateInsights(findings) {
        const validInsights = [];
        const anomalies = [];
        const seenTokens = [];
        const traceability_map = {}; // Maps technical concepts to their sources

        const stats = {
            repoCount: new Set(findings.map(f => f.repo)).size,
            strengths: {}
        };

        // Rarity Tiers
        const TIER_S = ['ast', 'compiler', 'memory', 'mutex', 'shader', 'gpu', 'dockerfile', 'protobuf', 'websocket', 'optimization', 'algorithm', 'security', 'auth', 'oauth', 'ipc'];

        for (const finding of findings) {
            // 1. Anomaly Check
            const insightTextRaw = finding.params?.insight || "";
            if (finding.tool === 'anomaly' || insightTextRaw.includes('INTEGRITY ANOMALY') || insightTextRaw.includes('⚠️')) {
                anomalies.push(finding);
            }

            if (!finding.params || !finding.params.insight) continue;

            // Tracking Volume for Weighting
            const strength = finding.params.technical_strength || 'General';
            stats.strengths[strength] = (stats.strengths[strength] || 0) + 1;

            const insightText = (finding.params.insight + " " + strength).toLowerCase();
            const tokens = new Set(insightText.split(/\W+/).filter(t => t.length > 3));

            // 2. Echo Detection (Deduplication)
            let isEcho = false;
            const lookback = seenTokens.slice(-10);

            for (let i = 0; i < lookback.length; i++) {
                const otherTokens = lookback[i];
                const intersection = new Set([...tokens].filter(x => otherTokens.has(x)));
                const union = new Set([...tokens, ...otherTokens]);
                const jaccard = intersection.size / union.size;

                if (jaccard > 0.65) {
                    isEcho = true;
                    break;
                }
            }

            // Reference Tracking: Always track where this "concept" comes from
            const sourceRef = {
                repo: finding.repo,
                file: finding.file,
                summary: insightTextRaw // Inclusion of the worker's summary as requested
            };

            if (!traceability_map[strength]) traceability_map[strength] = [];

            // Limit refs per strength to avoid massive JSON
            if (traceability_map[strength].length < 15) {
                // Deduplicate refs
                if (!traceability_map[strength].some(r => r.file === sourceRef.file)) {
                    traceability_map[strength].push(sourceRef);
                }
            }

            if (isEcho) {
                const prev = validInsights.find(v => v.params.insight.toLowerCase().includes(insightTextRaw.substring(0, 20).toLowerCase()));
                if (prev) {
                    prev.weight = (prev.weight || 1) + 1;
                }

                const isTierS = TIER_S.some(t => insightText.includes(t));
                if (!isTierS) continue;
            }

            finding.weight = 1;
            seenTokens.push(tokens);
            validInsights.push(finding);
        }

        // Finalize stats
        stats.topStrengths = Object.entries(stats.strengths)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));

        return { validInsights, anomalies, stats, traceability_map };
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
        // EVIDENCE-FIRST PROMPT: Forces model to extract real code BEFORE classifying
        const systemPrompt = `You analyze code files for developer profiling.

STEP 1: Extract the most important function, class, or variable name from the code.
STEP 2: Based on that evidence, classify the domain.

OUTPUT FORMAT (exactly one line):
[DOMAIN] Brief description | Evidence: <paste_actual_code_fragment>

DOMAIN OPTIONS: UI, Backend, Business, System, Game, Script, Data, Science, DevOps, Config

IMPORTANT:
- The evidence MUST be copied from the actual code shown below.
- STRICT RULE: Do not classify as "Game" unless it mentions game engines (Unity, Godot), sprites, or gameplay loops. 
- Administrative, Medical, or Management code is "Business" or "System", NOT "Game".
- Science or Physics simulations are "Science", NOT "Game".
- If code is empty or under 50 characters, output: SKIP
- Never invent function names. Only cite what exists in the code.`;

        const userPrompt = `File: ${repo}/${path}
\`\`\`
${usageSnippet.substring(0, 1000)}
\`\`\`
Analyze:`;

        try {
            return await AIService.callAI(systemPrompt, userPrompt, 0.1);
        } catch (e) {
            return `Analysis failed: ${e.message}`;
        }
    }
}
