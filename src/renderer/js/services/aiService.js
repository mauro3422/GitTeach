/**
 * AIService - Centraliza la inteligencia y el procesamiento de intenciones.
 * Sigue el principio de Responsabilidad Única (SOLID).
 */
export const AIService = {
    currentSessionContext: "", // Memoria de lo aprendido en el escaneo profundo

    /**
     * Actualiza el contexto de la sesión con los hallazgos de los workers.
     */
    setSessionContext(context) {
        this.currentSessionContext = context;
        console.log("[AIService] Contexto de sesión actualizado.");
    },
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
            const routerPrompt = PromptBuilder.getRouterPrompt(ToolRegistry.tools) +
                (this.currentSessionContext ? `\nCONTEXTO ACTUAL: ${this.currentSessionContext}` : "");
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

            if (window.githubAPI?.logToTerminal) {
                window.githubAPI.logToTerminal(`\n--- 🤖 AI ROUTER ---`);
                window.githubAPI.logToTerminal(`📥 USER INPUT: "${input}"`);
                window.githubAPI.logToTerminal(`🎯 INTENT: "${intent}"`);
                window.githubAPI.logToTerminal(`--------------------\n`);
            }

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

            if (window.githubAPI?.logToTerminal) {
                window.githubAPI.logToTerminal(`🤖 RAW AI RESPONSE: ${jsonResponse}`);
            }

            let parsedParams = {};

            try {
                const cleanJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJson);
                parsedParams = parsed.params || {};

                if (window.githubAPI?.logToTerminal) {
                    window.githubAPI.logToTerminal(`\n--- 🏗️ AI CONSTRUCTOR ---`);
                    window.githubAPI.logToTerminal(`🛠️ TOOL: ${tool.name}`);
                    window.githubAPI.logToTerminal(`📝 PARSED PARAMS: ${JSON.stringify(parsedParams, null, 2)}`);
                    window.githubAPI.logToTerminal(`------------------------\n`);
                }
            } catch (e) {
                console.error("JSON Parse Error", e);
                parsedParams = {};
            }

            // --- PASO 3: EJECUCIÓN (Acción Real) ---
            let executionResult = { success: false, details: "Herramienta no reconocida." };

            if (tool && typeof tool.execute === 'function') {
                executionResult = await tool.execute(parsedParams, username);

                // Si la herramienta genera contenido Markdown, lo insertamos en el editor
                if (executionResult.success && executionResult.content) {
                    AIToolbox.applyContent(executionResult.content);
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
