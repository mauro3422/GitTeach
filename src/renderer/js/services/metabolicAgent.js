/**
 * MetabolicAgent - The "Stomach" of the intelligence system.
 * Responsible for digesting new information, comparing it with existing DNA,
 * and deciding which insights are "Significant" enough to trigger a proactive reaction.
 * Prevents context bloat by managing incremental updates.
 */
import { Logger } from '../utils/logger.js';

export class MetabolicAgent {
    constructor() {
        this.lastDeltas = [];
    }

    /**
     * Digests new curation data and compares it with the current DNA state.
     * @param {object} oldDNA - Current persistent DNA
     * @param {object} newCuration - Freshly synthesized DNA from DeepCurator
     * @returns {object} { finalDNA, report, isSignificant }
     */
    digest(oldDNA, newCuration) {
        if (!newCuration) return { finalDNA: oldDNA, report: null, isSignificant: false };

        const report = {
            newSkills: [],
            scoreChanges: [],
            newAnomalies: [],
            milestones: []
        };

        let isSignificant = false;

        // 1. Check for Initial Synthesis
        if (!oldDNA || !oldDNA.bio) {
            Logger.metabolic("Initial DNA synthesis detected.");
            return {
                finalDNA: newCuration,
                report: { milestone: 'INITIAL_SYNTHESIS', bio: newCuration.bio },
                isSignificant: true
            };
        }

        // 2. Compare Traits (Habilidades)
        const oldTraitsMap = new Map((oldDNA.traits || []).map(t => [t.name, t.score]));

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

        // 3. Check for New Anomalies
        const oldAnomaliesCount = (oldDNA.anomalies || []).length;
        const newAnomaliesCount = (newCuration.anomalies || []).length;
        if (newAnomaliesCount > oldAnomaliesCount) {
            report.newAnomalies = newCuration.anomalies.slice(oldAnomaliesCount);
            isSignificant = true;
        }

        // 4. Update the "Stomach" history
        if (isSignificant) {
            this.lastDeltas.push({ timestamp: new Date().toISOString(), report });
            Logger.metabolic(`DNA evolved: ${report.newSkills.length} new skills, ${report.scoreChanges.length} score changes.`);
        }

        return {
            finalDNA: newCuration,
            report,
            isSignificant
        };
    }

    /**
     * Generates a "Metabolic Insight" for the proactive chat injection.
     * @param {object} report - The digest report
     * @returns {string} System instruction for the chat
     */
    generateMetabolicPrompt(report, username) {
        if (!report) return null;

        if (report.milestone === 'INITIAL_SYNTHESIS') {
            return "SYSTEM_EVENT: INITIAL_GREETING";
        }

        let message = `SYSTEM_EVENT: DNA_EVOLUTION_DETECTED\n`;
        message += `CONTEXT: El ADN de ${username} ha evolucionado.\n`;

        if (report.newSkills.length > 0) {
            message += `- NUEVAS HABILIDADES: ${report.newSkills.join(', ')}\n`;
        }

        if (report.scoreChanges.length > 0) {
            report.scoreChanges.forEach(c => {
                message += `- CAMBIO DE NIVEL: ${c.name} (${c.from}% -> ${c.to}%)\n`;
            });
        }

        if (report.newAnomalies.length > 0) {
            message += `- NUEVAS ANOMALÍAS DETECTADAS: ${report.newAnomalies.length}\n`;
        }

        message += `\nINSTRUCCIONES DE REACCIÓN:
1. NO saludes. 
2. Comenta proactivamente un cambio específico de arriba (ej: "Veo que tu nivel en Arquitectura ha subido").
3. Mantén el tono de Director de Arte Senior.
4. Sé muy breve (1-2 líneas).`;

        return message;
    }
}
