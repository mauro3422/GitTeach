/**
 * IntelligenceSynthesizer - The Core of the intelligence system.
 * Responsible for synthesizing new information, comparing it with existing Profile,
 * and deciding which insights are "Significant" enough to trigger a proactive reaction.
 * Prevents context bloat by managing incremental updates to the CognitiveProfile.
 */
import { Logger } from '../utils/logger.js';
import { AIService } from './aiService.js';
import { CacheRepository } from '../utils/cacheRepository.js';

export class IntelligenceSynthesizer {
    constructor(sessionId = null, debugLogger = null) {
        console.log(`[IntelligenceSynthesizer] Constructor called. debugLogger is: ${debugLogger ? typeof debugLogger : 'NULL'}`);
        this.lastDeltas = [];
        this.sessionId = sessionId;
        this.debugLogger = debugLogger;
        this.technicalProfile = null; // The "Cognitive Profile" (in RAM)
        this.currentUsername = null;
    }

    /**
     * Load the CognitiveProfile from disk (if exists)
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
            console.warn('[IntelligenceSynthesizer] Could not load from disk:', e);
        }
        return null;
    }

    /**
     * Save the CognitiveProfile to disk
     * Call this after every synthesis to persist the state
     */
    async saveToDisk() {
        if (!this.currentUsername || !this.technicalProfile) return false;
        try {
            await CacheRepository.setCognitiveProfile(this.currentUsername, this.technicalProfile);
            Logger.profile(`Saved Cognitive Profile to disk: ${this.technicalProfile.title}`);
            return true;
        } catch (e) {
            console.warn('[IntelligenceSynthesizer] Could not save to disk:', e);
            return false;
        }
    }

    /**
     * Synthesizes new curation data and compares it with the current Identity state.
     * @param {object} oldProfile - Current persistent Identity
     * @param {object} newCuration - Freshly synthesized Identity from DeepCurator
     * @param {Array} chatHistory - (Optional) Current conversation context
     * @returns {object} { finalProfile, report, isSignificant }
     */
    async synthesizeProfile(oldProfile, newCuration, chatHistory = []) {
        console.log(`[IntelligenceSynthesizer] Starting synthesis. NewCuration keys: ${newCuration ? Object.keys(newCuration).join(',') : 'null'}`);
        if (!newCuration) return { finalProfile: oldProfile, report: null, isSignificant: false };

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
        if (!oldProfile || !oldProfile.bio) {
            Logger.profile("Initial Identity synthesis detected.");
            this.technicalProfile = this._fallbackStabilize(newCuration, { newSkills: [], scoreChanges: [] });
            const initialReport = { milestone: 'INITIAL_SYNTHESIS', bio: newCuration.bio, profileUpdate: this.technicalProfile };

            // Persist to disk immediately
            await this.saveToDisk();

            // Log even for initial synthesis
            await this._logSynthesisState(null, newCuration, initialReport, true);

            return {
                finalProfile: newCuration,
                report: initialReport,
                isSignificant: true
            };
        }

        // 2. Compare Traits (Manual Check for Significance)
        const oldTraitsMap = new Map((oldProfile.traits || []).map(t => [t.name, t.score]));

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
        const oldAnomalies = (oldProfile.anomalies || []).length;
        const newAnomaliesCount = (newCuration.anomalies || []).length;
        if (newAnomaliesCount > oldAnomalies) {
            report.newAnomalies = newCuration.anomalies.slice(oldAnomalies);
            isSignificant = true;
        }

        // --- AGENTIC DIGESTION (Synthesis) ---
        // If changes are meaningful, use AI to update the persistent identity (NOT just overwrite)
        if (isSignificant) {
            Logger.profile("Significant technical evolution found. Re-synthesizing Technical Profile...");

            this.technicalProfile = await this._synthesizeEvolvedProfile(oldProfile, newCuration, report);
            report.profileUpdate = this.technicalProfile;
            report.evolutionSnapshot = this.technicalProfile.evolution_snapshot;

            // Persist to disk after evolution
            await this.saveToDisk();
        } else {
            Logger.profile("No significant changes. Keeping previous stable profile.");
            this.technicalProfile = oldProfile;
        }

        // Log the state
        await this._logSynthesisState(oldProfile, newCuration, report, isSignificant);

        return {
            finalProfile: this.technicalProfile,
            report: report,
            isSignificant: isSignificant
        };
    }

    /**
     * Incremental synthesis for Streaming Map-Reduce.
     * Evaluates if a batch of findings triggers a significant insight.
     */
    synthesizeBatch(batchStats) {
        // Quick heuristic: If we found new domains or significant number of findings
        if (batchStats && batchStats.totalFindings > 5 && batchStats.domains.length > 0) {
            return {
                isSignificant: true,
                snapshot: `Evolución en curso: Detectados ${batchStats.totalFindings} hallazgos en ${batchStats.domains.join(', ')}`
            };
        }
        return { isSignificant: false };
    }

    /**
     * FALLBACK: When AI synthesis isn't needed or available, simple merge.
     */
    _fallbackStabilize(newDNA, changes) {
        return {
            title: `Technical Profile (Auto-Generated)`,
            bio: newDNA.bio,
            core_languages: [], // extracted separately
            domain: "General Software Development",
            patterns: [],
            evolution_snapshot: "Initial snapshot created.",
            traits: newDNA.traits,
            anomalies: newDNA.anomalies,
            last_updated: new Date().toISOString()
        };
    }

    async _synthesizeEvolvedProfile(oldProfile, newDNA, report) {
        // Prepare context for the Master AI
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

        try {
            const response = await AIService.callAI(systemPrompt, context, 0.4, 'json_object');
            let parsed = null;
            try {
                parsed = JSON.parse(response);
            } catch (e) {
                console.warn("[IntelligenceSynthesizer] AI JSON parse failed, using raw text fallback");
                return oldProfile; // Fail safe
            }

            return {
                ...parsed,
                traits: newDNA.traits, // Always trust fresh evidence for traits
                anomalies: newDNA.anomalies,
                last_updated: new Date().toISOString()
            };

        } catch (error) {
            console.error("[IntelligenceSynthesizer] Synthesis Error:", error);
            return oldProfile;
        }
    }

    /**
     * Logs the synthesis decision to detailed JSONL logs
     */
    async _logSynthesisState(oldProfile, newCuration, report, isSignificant) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            isSignificant,
            report,
            oldBioLength: oldProfile ? oldProfile.bio.length : 0,
            newBioLength: newCuration ? newCuration.bio.length : 0
        };

        // Use DebugLogger if available
        if (this.debugLogger) {
            this.debugLogger.logCurator('synthesis_decisions', logEntry);
        }
    }
}
