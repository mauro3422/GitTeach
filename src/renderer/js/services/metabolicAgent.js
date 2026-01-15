/**
 * MetabolicAgent - The "Stomach" of the intelligence system.
 * Responsible for digesting new information, comparing it with existing DNA,
 * and deciding which insights are "Significant" enough to trigger a proactive reaction.
 * Prevents context bloat by managing incremental updates to the BaseContextUser.
 */
import { Logger } from '../utils/logger.js';
import { AIService } from './aiService.js';
import { CacheRepository } from '../utils/cacheRepository.js';

export class MetabolicAgent {
    constructor(sessionId = null, debugLogger = null) {
        console.log(`[MetabolicAgent] Constructor called. debugLogger is: ${debugLogger ? typeof debugLogger : 'NULL'}`);
        this.lastDeltas = [];
        this.sessionId = sessionId;
        this.debugLogger = debugLogger;
        this.technicalProfile = null; // The "Cognitive Profile" (in RAM)
        this.currentUsername = null;
    }

    /**
     * Load the BaseContextUser from disk (if exists)
     * Call this at the start of analysis to restore previous state
     */
    async loadFromDisk(username) {
        this.currentUsername = username;
        try {
            const saved = await CacheRepository.getCognitiveProfile(username);
            if (saved) {
                this.technicalProfile = saved;
                Logger.profile(`Loaded Cognitive Profile from disk: ${saved.title}`);
                return saved;
            }
        } catch (e) {
            console.warn('[MetabolicAgent] Could not load from disk:', e);
        }
        return null;
    }

    /**
     * Save the BaseContextUser to disk
     * Call this after every synthesis to persist the state
     */
    async saveToDisk() {
        if (!this.currentUsername || !this.technicalProfile) return false;
        try {
            await CacheRepository.setCognitiveProfile(this.currentUsername, this.technicalProfile);
            Logger.profile(`Saved Cognitive Profile to disk: ${this.technicalProfile.title}`);
            return true;
        } catch (e) {
            console.warn('[MetabolicAgent] Could not save to disk:', e);
            return false;
        }
    }

    /**
     * Digests new curation data and compares it with the current Identity state.
     * @param {object} oldIdentity - Current persistent Identity
     * @param {object} newCuration - Freshly synthesized Identity from DeepCurator
     * @param {Array} chatHistory - (Optional) Current conversation context
     * @returns {object} { finalDNA, report, isSignificant }
     */
    async digest(oldIdentity, newCuration, chatHistory = []) {
        console.log(`[MetabolicAgent] Starting digestion. NewCuration keys: ${newCuration ? Object.keys(newCuration).join(',') : 'null'}`);
        if (!newCuration) return { finalDNA: oldDNA, report: null, isSignificant: false };

        const report = {
            newSkills: [],
            scoreChanges: [],
            newAnomalies: [],
            milestones: [],
            profileUpdate: null,
            evolutionSnapshot: ""
        };

        let isSignificant = false;

        // 1. Check for Initial Synthesis
        if (!oldIdentity || !oldIdentity.bio) {
            Logger.profile("Initial Identity synthesis detected.");
            this.technicalProfile = this._fallbackStabilize(newCuration, { newSkills: [], scoreChanges: [] });
            const initialReport = { milestone: 'INITIAL_SYNTHESIS', bio: newCuration.bio, profileUpdate: this.technicalProfile };

            // Persist to disk immediately
            await this.saveToDisk();

            // Log even for initial synthesis
            await this._logMetabolicState(null, newCuration, initialReport, true);

            return {
                finalDNA: newCuration,
                report: initialReport,
                isSignificant: true
            };
        }

        // 2. Compare Traits (Manual Check for Significance)
        const oldTraitsMap = new Map((oldIdentity.traits || []).map(t => [t.name, t.score]));

        if (newCuration.traits) {
            for (const trait of newCuration.traits) {
                const oldScore = oldTraitsMap.get(trait.name);

                if (oldScore === undefined) {
                    report.newSkills.push(trait.name);
                    isSignificant = true;
                } else if (Math.abs(trait.score - oldScore) >= 10) {
                    report.scoreChanges.push({ name: trait.name, from: oldScore, to: trait.score });
                    isSignificant = true;
                }
            }
        }

        // 3. Compare Anomalies
        const oldAnomalies = (oldIdentity.anomalies || []).length;
        const newAnomaliesCount = (newCuration.anomalies || []).length;
        if (newAnomaliesCount > oldAnomalies) {
            report.newAnomalies = newCuration.anomalies.slice(oldAnomalies);
            isSignificant = true;
        }

        // --- AGENTIC DIGESTION (Synthesis) ---
        // If changes are meaningful, use AI to update the persistent identity (NOT just overwrite)
        if (isSignificant) {
            Logger.profile("Significant technical evolution found. Re-synthesizing Technical Profile...");

            this.technicalProfile = await this._synthesizeEvolvedProfile(oldIdentity, newCuration, report);
            report.profileUpdate = this.technicalProfile;
            report.evolutionSnapshot = this.technicalProfile.evolution_snapshot;

            // Persist to disk after evolution
            await this.saveToDisk();

            this.lastDeltas.push({ timestamp: new Date().toISOString(), report });
        }

        // Log ALWAYS, so we can track stability (no-change) too
        await this._logMetabolicState(oldIdentity, newCuration, report, isSignificant);

        return {
            finalDNA: newCuration,
            report,
            isSignificant
        };
    }

    /**
     * The Brain: Intelligently merges previous identity with new findings.
     * @private
     */
    async _synthesizeEvolvedProfile(oldIdentity, newIdentity, report) {
        const prompt = `YOU ARE THE TECHNICAL IDENTITY MASTER.
        
        TASK: Update the "Cognitive Profile" (stabilized identity) without losing the developer's core essence but precisely incorporating new evolutions.
        
        CURRENT IDENTITY:
        - Title: ${oldIdentity.verdict || "Desarrollador General"}
        - Core Bio: ${oldIdentity.bio?.substring(0, 300)}...
        
        NEW FINDINGS:
        - New Skills: ${report.newSkills.join(', ') || 'None'}
        - Level Changes: ${report.scoreChanges.map(c => `${c.name}: ${c.from}% -> ${c.to}%`).join(', ') || 'None'}
        - New Anomalies: ${report.newAnomalies.length}
        - Latest Verdict: ${newDNA.verdict}
        
        CONSTRAINTS:
        1. PERSISTENCE: If a skill was already there, describe it as "Fortalecida" (Strengthened).
        2. DYNAMIC TITLE: Evolve the title (e.g. from "Python Dev" to "Python Architect with Game Dev focus").
        3. BREVITY: Output must be dense (MAX 250 words total in JSON).
        
        OUTPUT SCHEMA (Strict JSON):
        {
          "title": "New Evolved Title",
          "core_languages": ["Top 5 updated languages"],
          "patterns": ["Top 5 updated technical patterns"],
          "evolution_snapshot": "A 2-sentence 'Eureka' moment describing the evolution (e.g. 'He notado que has pasado de scripts aislados a una arquitectura de simulación robusta')."
        }`;

        try {
            const response = await AIService.callAI("Metabolic Processor", prompt, 0.2);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            const evolved = JSON.parse(jsonMatch[0]);

            return {
                ...evolved,
                domain: evolved.title,
                anomalies: (newDNA.anomalies || []).slice(0, 3)
            };
        } catch (e) {
            Logger.warn('MetabolicAgent', "AI Evolution failed, following fallback.");
            return this._fallbackStabilize(newDNA, report);
        }
    }

    /**
     * Fallback (Non-AI) stabilization logic.
     * @private
     */
    _fallbackStabilize(dna, report) {
        return {
            title: dna.verdict || "Desarrollador Senior",
            core_languages: (dna.mainLangs || []).slice(0, 5),
            domain: dna.bio?.match(/focus on \*\*(.*?)\*\*/)?.[1] || "Sistemas Técnicos",
            patterns: (dna.traits || []).filter(t => t.score > 70).map(t => t.name).slice(0, 5),
            anomalies: (dna.anomalies || []).slice(0, 3),
            evolution_snapshot: `Evolución detectada en: ${report.newSkills.join(', ') || 'habilidades core'}.`
        };
    }

    /**
     * Generates a "Metabolic Insight" for proactive chat.
     */
    generateMetabolicPrompt(report, username) {
        if (!report) return null;

        if (report.milestone === 'INITIAL_SYNTHESIS') {
            return "SYSTEM_EVENT: INITIAL_GREETING";
        }

        let message = `SYSTEM_EVENT: DNA_EVOLUTION_DETECTED\n`;
        message += `EVOLUCION: ${report.evolutionSnapshot || 'Nuevos hallazgos técnicos.'}\n`;

        if (report.newSkills.length > 0) message += `- NUEVAS HABILIDADES: ${report.newSkills.join(', ')}\n`;
        if (report.scoreChanges.length > 0) {
            report.scoreChanges.forEach(c => message += `- PROGRESO: ${c.name} (${c.from}% -> ${c.to}%)\n`);
        }

        message += `\nINSTRUCCIONES:
1. NO saludes.
2. Reacciona al Snapshot de Evolución de arriba de forma perspicaz.
3. Actúa como si acabaras de procesar algo brillante sobre el usuario.
4. Máximo 2 líneas convencionales.`;

        return message;
    }

    async _logMetabolicState(oldDNA, newCuration, report, isSignificant) {
        if (!this.debugLogger) {
            console.log('[MetabolicAgent] _logMetabolicState SKIPPED: No DebugLogger instance.');
            return;
        }
        try {
            this.debugLogger.logCurator('metabolic_report', {
                timestamp: new Date().toISOString(),
                profile: this.technicalProfile,
                report,
                isSignificant
            });
        } catch (e) {
            Logger.error("Failed to persist metabolic state:", e);
        }
    }
}
