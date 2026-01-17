import { ToolRegistry } from '../toolRegistry.js';
import { PromptBuilder } from '../promptBuilder.js';
import { Logger } from '../../utils/logger.js';

/**
 * IntentRouter - Smart RAG Router with Query Expansion and Memory Source Selection.
 * 
 * Returns: { intent, searchTerms, memorySource, thought }
 */
export class IntentRouter {
    static async route(input, context, callAI) {
        const routerPrompt = PromptBuilder.getRouterPrompt(ToolRegistry.tools) +
            (context ? `\n\n### CURRENT USER PROFILE (Identity):\n${context}\n\n` : "") +
            `INSTRUCTION: Use the profile above to understand the developer's specialty and tone. 
            If the query is about their code, favor 'query_memory' or 'read_file'. 
            If it's about their identity, favor 'chat' with their established technical personality.`;

        const response = await callAI(routerPrompt, input, 0.0, 'json_object');

        // Default result
        let result = {
            intent: 'chat',
            searchTerms: [],
            memorySource: null,
            thought: null
        };

        try {
            const data = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');

            const thought = data.thought || "Razonamiento implícito del modelo";
            if (thought) {
                Logger.info('BRAIN', `Thinking: "${thought}"`);
                result.thought = thought;
            }

            // Extract new Smart RAG fields
            result.intent = data.tool || 'chat';
            result.params = data.params || {};
            result.searchTerms = Array.isArray(data.searchTerms) ? data.searchTerms : [];
            result.memorySource = data.memorySource || null;
            result.whisper = data.whisper_to_chat || data.chat_guidance || null;

            // Log Smart RAG decision
            if (result.searchTerms.length > 0) {
                Logger.info('BRAIN', `Search Terms: [${result.searchTerms.join(', ')}]`);
            }
            if (result.memorySource) {
                Logger.info('BRAIN', `Memory Source: ${result.memorySource}`);
            }
            if (result.whisper) {
                Logger.info('BRAIN', `Whisper: "${result.whisper}"`);
            }

            // Heuristic corrections (backward compatibility)
            const hasFileExtension = /\.(py|js|cpp|h|json|md|html|css|txt)$/i.test(input);
            const hasPath = input.includes("/") || input.includes("\\");
            if (result.intent === 'read_repo' && (hasFileExtension || hasPath) && !input.toLowerCase().includes("readme")) {
                result.intent = 'read_file';
            }

        } catch (e) {
            console.warn("[IntentRouter] Router Fallback", e);
            // Fallback: try to extract tool from raw response
            const knownTools = ToolRegistry.tools.map(t => t.id.toLowerCase());
            const stripped = response.trim().toLowerCase();
            result.intent = knownTools.includes(stripped) ? stripped : 'chat';
        }

        Logger.ai('ROUTER', `INPUT: "${input.substring(0, 50)}..." → INTENT: "${result.intent}"`);
        return result;
    }
}
