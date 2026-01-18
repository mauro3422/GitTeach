import { AIService } from '../aiService.js';

/**
 * EvolutionManager - Orchestrates AI-based profile synthesis and refinement.
 */
export class EvolutionManager {
    static async evolve(oldProfile, newDNA, report) {
        const systemPrompt = `YOU ARE THE TECHNICAL IDENTITY MASTER.
        Your goal is to SYNTHESIZE a new, coherent profile from the OLD profile and NEW evidence.
        DO NOT simply discard the old one. INTEGRATE them.
        
        Output JSON format:
        {
            "title": "Short professional title (e.g. Senior Backend Engineer)",
            "bio": "2-3 sentences synthesizing the developer's journey and current focus.",
            "core_languages": ["Lang1", "Lang2"],
            "domain": "Primary domain (e.g. Fintech, GameDev)",
            "patterns": ["Pattern1", "Pattern2"],
            "traits": [{"name": "TraitName", "score": 85, "details": "why..."}],
            "anomalies": [{"trait": "Pattern", "impact": "High", "evidence": "..."}],
            "evolution_snapshot": "1 sentence describing this specific evolution step."
        }`;

        const context = `
        OLD PROFILE:
        Title: ${oldProfile?.title || 'Unknown'}
        Bio: ${oldProfile?.bio || 'None'}
        Traits: ${(oldProfile?.traits || []).map(t => `${t.name}(${t.score})`).join(', ')}

        NEW DNA EVIDENCE:
        Bio: ${newDNA.bio}
        Traits: ${(newDNA.traits || []).map(t => `${t.name}(${t.score})`).join(', ')}

        DETECTED EVOLUTION REPORT:
        New Skills: ${report.newSkills.length > 0 ? report.newSkills.join(', ') : 'None'}
        Score Shifts: ${report.scoreChanges.length > 0 ? report.scoreChanges.map(s => `${s.name} ${s.from}->${s.to}`).join(', ') : 'None'}
        New Anomalies: ${report.newAnomalies.length > 0 ? report.newAnomalies.map(a => `${a.trait}: ${a.impact}`).join(', ') : 'None'}
        `;

        try {
            // Use CPU server for identity evolution (avoid blocking GPU workers)
            const response = await AIService.callAI_CPU(systemPrompt, context, 0.4, 'json_object');
            const parsed = JSON.parse(response);

            return {
                ...parsed,
                thought: newDNA.thought || parsed.thought, // Preserve high-level reasoning
                code_health: newDNA.code_health, // Preserve Integrity Scores from DNA
                presentation: newDNA.presentation, // Preserve Radar Data from DNA
                last_updated: new Date().toISOString()
            };
        } catch (error) {
            console.error("[EvolutionManager] AI Synthesis Error:", error);
            return oldProfile; // Fail safe
        }
    }

    static getInitialProfile(newDNA) {
        return {
            title: `Technical Profile (Initial)`,
            thought: newDNA.thought, // Preserve high-level reasoning
            bio: newDNA.bio,
            core_languages: [],
            domain: "General Software Development",
            patterns: [],
            evolution_snapshot: "Initial snapshot created.",
            traits: newDNA.traits || [],
            anomalies: newDNA.anomalies || [],
            code_health: newDNA.code_health, // Preserve Integrity Scores
            presentation: newDNA.presentation, // Preserve Radar Data
            last_updated: new Date().toISOString()
        };
    }
}
