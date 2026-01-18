/**
 * ChatPromptBuilder - Construye prompts para conversaciones de chat.
 * Extrae la lógica de generación de prompts de chat del AIService.
 * 
 * Responsabilidad única: Generar el system prompt para el "Director de Arte"
 * basado en si hay o no contexto de sesión disponible.
 */

import { PersonaPrompts } from '../../prompts/chat/PersonaPrompts.js';

export class ChatPromptBuilder {
    /**
     * Construye el prompt del sistema para conversación de chat.
     * @param {string} username - Username del usuario
     * @param {string} sessionContext - Contexto de sesión (identidad técnica)
     * @param {string} brainThought - Lo que el cerebro pensó (CoT)
     * @param {string} brainWhisper - Instrucción estratégica (Whisper)
     * @returns {string} System prompt completo
     */
    static build(username, sessionContext, brainThought = null, brainWhisper = null) {
        // Ensure sessionContext is a string or empty
        const safeContext = (typeof sessionContext === 'string')
            ? sessionContext
            : (sessionContext ? JSON.stringify(sessionContext) : '');

        const hasRAG = safeContext.includes('RELEVANT TECHNICAL MEMORY');

        let basePrompt = (safeContext.length > 50)
            ? PersonaPrompts.formatRichPrompt(username, safeContext)
            : PersonaPrompts.formatBasicPrompt(username);

        if (hasRAG) {
            basePrompt += `\n\n## ⚡ INSTRUCTION: RAG ACTIVE\nThe 'RELEVANT TECHNICAL MEMORY' section contains exact code snippets from the user's files.\nCITE these snippets in your answer to prove deep understanding.`;
        }

        // La danza: El cerebro le habla a la voz
        if (brainThought || brainWhisper) {
            basePrompt += PersonaPrompts.formatWhisper(brainThought, brainWhisper);
        }

        return basePrompt;
    }

    /**
     * Prompt con contexto técnico completo.
     */
}
