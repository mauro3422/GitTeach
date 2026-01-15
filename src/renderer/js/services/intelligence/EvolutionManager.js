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
            "evolution_snapshot": "1 sentence describing this specific evolution step."
        }`;

        const context = `
        OLD PROFILE:
        Bio: ${oldProfile.bio}
        Traits: ${oldProfile.traits.map(t => t.name).join(', ')}

        NEW DNA EVIDENCE:
        Bio: ${newDNA.bio}
        Traits: ${newDNA.traits.map(t => t.name).join(', ')}

        DETECTED EVOLUTION:
        New Skills: ${report.newSkills.join(', ')}
        Score Shifts: ${report.scoreChanges.map(s => `${s.name} ${s.from}->${s.to}`).join(', ')}
        `;

        try {
            const response = await AIService.callAI(systemPrompt, context, 0.4, 'json_object');
            const parsed = JSON.parse(response);

            return {
                ...parsed,
                traits: newDNA.traits,
                anomalies: newDNA.anomalies,
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
            bio: newDNA.bio,
            core_languages: [],
            domain: "General Software Development",
            patterns: [],
            evolution_snapshot: "Initial snapshot created.",
            traits: newDNA.traits,
            anomalies: newDNA.anomalies,
            last_updated: new Date().toISOString()
        };
    }
}
