import { ToolRegistry } from '../toolRegistry.js';
import { PromptBuilder } from '../promptBuilder.js';
import { Logger } from '../../utils/logger.js';

/**
 * IntentRouter - Analyzes user input to determine the best tool or chat response.
 */
export class IntentRouter {
    static async route(input, context, callAI) {
        const routerPrompt = PromptBuilder.getRouterPrompt(ToolRegistry.tools) +
            (context ? `\nCURRENT CONTEXT: ${context} ` : "");

        const response = await callAI(routerPrompt, input, 0.0, 'json_object');

        let intent = 'chat';
        try {
            const data = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');

            if (data.thought) {
                Logger.info('BRAIN', `Thinking: "${data.thought}"`);
            }

            // Heuristic for generic identity questions
            const isGenericIdentity = (input.toLowerCase().includes("quien soy") || input.toLowerCase().includes("mi perfil")) &&
                !input.toLowerCase().includes("/");

            if (isGenericIdentity) {
                intent = 'chat';
            } else {
                intent = data.tool || 'chat';

                // Correction for specific files
                const hasFileExtension = /\.(py|js|cpp|h|json|md|html|css|txt)$/i.test(input);
                const hasPath = input.includes("/") || input.includes("\\");
                if (intent === 'read_repo' && (hasFileExtension || hasPath) && !input.toLowerCase().includes("readme")) {
                    intent = 'read_file';
                }
            }
        } catch (e) {
            console.warn("[IntentRouter] Router Fallback", e);
            const inputLower = input.toLowerCase();
            if (inputLower.includes("sabes de mi") || inputLower.includes("quien soy")) {
                intent = 'chat';
            } else {
                const knownTools = ToolRegistry.tools.map(t => t.id.toLowerCase());
                const stripped = response.trim().toLowerCase();
                intent = knownTools.includes(stripped) ? stripped : 'chat';
            }
        }

        Logger.ai('ROUTER', `INPUT: "${input.substring(0, 50)}..." → INTENT: "${intent}"`);
        return intent;
    }
}
