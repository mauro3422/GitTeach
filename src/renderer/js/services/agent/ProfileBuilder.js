import { ProfilePromptBuilder } from '../ai/ProfilePromptBuilder.js';
import { Logger } from '../../utils/logger.js';

/**
 * ProfileBuilder - Agentic Service for User Identities.
 * Implements the "Mirror Loop" (Draft -> Critique -> Finalize).
 */
export class ProfileBuilder {
    constructor(aiService) {
        this.aiService = aiService;
    }

    async generateProfile(username, identityContext) {
        Logger.info('AGENT', `[ProfileBuilder] 🏗️ Starting Agentic Loop for ${username}...`);

        // 1. DRAFT
        Logger.info('AGENT', `[ProfileBuilder] 📝 Phase 1: Drafting based on DNA...`);
        const draftPrompt = ProfilePromptBuilder.getDraftPrompt(username, identityContext);
        const draft = await this.aiService.callAI(draftPrompt, "Generate Draft", 0.7);

        // 2. CRITIQUE (The Mirror)
        Logger.info('AGENT', `[ProfileBuilder] 🪞 Phase 2: Critiquing validity...`);
        const critiquePrompt = ProfilePromptBuilder.getCritiquePrompt(draft, identityContext);
        // Force JSON for critique
        const critiqueRaw = await this.aiService.callAI(critiquePrompt, "Critique Draft", 0.2, 'json_object');

        let critique = {};
        try {
            critique = JSON.parse(critiqueRaw.match(/\{[\s\S]*\}/)?.[0] || '{}');
            Logger.info('AGENT', `[ProfileBuilder] Critique Result: ${JSON.stringify(critique)}`);
        } catch (e) {
            Logger.warn('AGENT', `[ProfileBuilder] Critique parse failed, assuming valid.`);
        }

        // 3. FINALIZE (Polish)
        Logger.info('AGENT', `[ProfileBuilder] ✨ Phase 3: Finalizing & Polishing...`);
        let finalPrompt;

        if (critique.correction_needed) {
            finalPrompt = ProfilePromptBuilder.getFinalizePrompt(draft, `CRITICAL CORRECTIONS REQUIRED: ${critique.critique}`);
        } else {
            finalPrompt = ProfilePromptBuilder.getFinalizePrompt(draft, "No major corrections. Focus on visual polish.");
        }

        const finalReadme = await this.aiService.callAI(finalPrompt, "Final Polish", 0.7);

        return {
            content: finalReadme,
            meta: {
                critique_applied: critique.correction_needed || false,
                critique_text: critique.critique || "None"
            }
        };
    }
}
