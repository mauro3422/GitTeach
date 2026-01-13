/**
 * AIService - Centraliza la inteligencia y el procesamiento de intenciones.
 * Sigue el principio de Responsabilidad Única (SOLID).
 */
export const AIService = {
    /**
     * Procesa la entrada del usuario usando LFM 2.5 local.
     * @param {string} input 
     * @returns {Promise<{action: string, toolId: string, message: string}>}
     */
    async processIntent(input, username) {
        try {
            const { ToolRegistry } = await import('./toolRegistry.js');
            const { PromptBuilder } = await import('./promptBuilder.js');
            const { AIToolbox } = await import('./aiToolbox.js'); // Importar Toolbox para ejecución interna

            // --- PASO 1: ROUTER (Identificar Intención) ---
            const routerPrompt = PromptBuilder.getRouterPrompt(ToolRegistry.tools);
            const routerResponse = await this.callAI(routerPrompt, input, 0.0);

            let intent = 'chat';
            try {
                const cleanJson = routerResponse.replace(/^```json/, '').replace(/```$/, '').trim();
                const data = JSON.parse(cleanJson);
                intent = data.tool || 'chat';
            } catch (e) {
                console.warn("[AIService] Router Fallback", e);
                intent = routerResponse.trim().toLowerCase();
            }

            console.log(`[AIService] Router Intent: "${intent}"`);

            // --- CASO CHAT (Sin Herramienta) ---
            if (intent === 'chat' || intent.includes('chat')) {
                const chatPrompt = "Eres un experto en GitHub amigable. Responde brevemente en español.";
                const chatReply = await this.callAI(chatPrompt, input, 0.7);
                return { action: "chat", message: chatReply };
            }

            // --- PASO 2: CONSTRUCTOR (Extraer Parámetros) ---
            const tool = ToolRegistry.getById(intent);
            if (!tool) return { action: "chat", message: "No reconozco el comando: " + intent };

            const constructorPrompt = PromptBuilder.getConstructorPrompt(tool);
            const jsonResponse = await this.callAI(constructorPrompt, input, 0.0); // Temp 0 para precisión JSON

            let parsedParams = {};
            try {
                const cleanJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJson);
                parsedParams = parsed.params || {};

                // Log para transparencia
                if (window.githubAPI?.logToTerminal) {
                    window.githubAPI.logToTerminal("🤖 PLANIFICACIÓN (JSON): " + JSON.stringify(parsed, null, 2));
                }
            } catch (e) {
                console.error("JSON Parse Error", e);
                parsedParams = {};
            }

            // --- PASO 3: EJECUCIÓN (Acción Real) ---
            // Aquí cerramos el ciclo. La IA no "predice", el sistema "ejecuta".
            let executionResult = { success: false, details: "Herramienta no implementada." };

            const allowedTools = ['welcome_header', 'github_stats', 'top_langs', 'tech_stack', 'contribution_snake', 'list_repos', 'read_repo', 'github_trophies', 'streak_stats', 'profile_views'];

            if (allowedTools.includes(intent)) {
                if (intent === 'list_repos') {
                    executionResult = await AIToolbox.listRepos();
                } else if (intent === 'read_repo') {
                    executionResult = await AIToolbox.readRepo(username, parsedParams);
                } else {
                    executionResult = AIToolbox.insertBanner(intent, username, parsedParams);
                }
            }

            // Log de observación
            if (window.githubAPI?.logToTerminal) {
                window.githubAPI.logToTerminal(`👁️ OBSERVACIÓN: ${executionResult.details} (Success: ${executionResult.success})`);
            }

            // --- PASO 4: RESPONDEDOR (Ciclo Cerrado) ---
            // La IA recibe la confirmación real de la ejecución y genera la respuesta final.
            const responsePrompt = PromptBuilder.getPostActionPrompt(tool.name, executionResult, input);
            const finalMessage = await this.callAI(responsePrompt, input, 0.7);

            return {
                action: "chat", // Ya se ejecutó, esto es solo información
                message: finalMessage
            };

        } catch (error) {
            console.error("Error AI Details:", error);
            return { action: "chat", message: `Error técnico: ${error.message || error}` };
        }
    },

    async callAI(systemPrompt, userMessage, temperature) {
        // --- CONFIGURACIÓN LOCAL LFM 2.5 (Restaurada) ---
        const ENDPOINT = 'http://localhost:8000/v1/chat/completions';

        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "lfm2.5", // Nombre del modelo local
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage }
                    ],
                    temperature: temperature
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Local LFM Error: ${response.status} - ${err}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error("Critical AI Error:", error);
            throw error;
        }
    }

};
