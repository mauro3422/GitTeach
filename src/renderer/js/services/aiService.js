/**
 * AIService - Centraliza la inteligencia y el procesamiento de intenciones.
 * Sigue el principio de Responsabilidad Única (SOLID).
 * UPDATED: Usa Logger y CacheRepository centralizados
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';

export const AIService = {
    currentSessionContext: "", // Memoria de lo aprendido en el escaneo profundo

    /**
     * Actualiza el contexto de la sesión con los hallazgos de los workers.
     */
    setSessionContext(context) {
        this.currentSessionContext = context;
        Logger.info('AIService', 'Contexto de sesión actualizado.');
    },
    /**
     * Procesa la entrada del usuario usando LFM 2.5 local.
     * @param {string} input 
     * @returns {Promise<{action: string, toolId: string, message: string}>}
     */
    async processIntent(input, username) {
        try {
            // --- DETECCIÓN DE EVENTOS DE SISTEMA (PROACTIVIDAD) ---
            if (input.startsWith("SYSTEM_EVENT:")) {
                const eventType = input.replace("SYSTEM_EVENT:", "").trim();

                if (eventType === "DEEP_MEMORY_READY_ACKNOWLEDGE") {
                    // Prompt especial: La IA acaba de recibir un "cerebro nuevo".
                    // Debe reaccionar a ello.
                    const reactionPrompt = `
# SYSTEM UPDATE: MEMORIA PROFUNDA SINCRONIZADA
Acabas de recibir un análisis masivo del código de ${username}.
Tu nueva memoria contiene:
${this.currentSessionContext || "Datos insuficientes"}

## TU TAREA:
No saludes de nuevo. Simplemente lanza un "Insight" o comentario interesante sobre lo que acabas de descubrir.
Ejemplos:
- "Vaya, no sabía que usabas X patrón en el proyecto Y."
- "Veo que te gusta mucho Python, pero tu estructura de carpetas en C++ es muy limpia."
- "Interesante mezcla de tecnologías en [Repo]."

Sé breve, natural y directo. Sorprende al usuario con tu proactividad.`;

                    const response = await this.callAI(reactionPrompt, "Genera tu insight ahora based on the above system update.", 0.7); // Temperatura media para creatividad
                    return { message: response, tool: 'chat' };
                }

                return { message: "Evento de sistema desconocido.", tool: 'chat' };
            }

            // 1. Identificar intenciones con Llama local
            const { ToolRegistry } = await import('./toolRegistry.js');
            const { PromptBuilder } = await import('./promptBuilder.js');
            const { AIToolbox } = await import('./aiToolbox.js');
            const { ProfileAnalyzer } = await import('./profileAnalyzer.js');
            const { ChatComponent } = await import('../components/chatComponent.js');

            // --- AUTO-CARGA DE MEMORIA PERSISTENTE ---
            if (!this.currentSessionContext) {
                const dna = await CacheRepository.getDeveloperDNA(username);
                if (dna) {
                    const analyzer = new ProfileAnalyzer();
                    this.currentSessionContext = analyzer.getFreshContext(username, dna);
                    Logger.info('AIService', 'Memoria profunda recuperada del cache.');
                }
            }

            // --- PASO 1: ROUTER (Identificar Intención) ---
            const routerPrompt = PromptBuilder.getRouterPrompt(ToolRegistry.tools) +
                (this.currentSessionContext ? `\nCONTEXTO ACTUAL: ${this.currentSessionContext}` : "");
            const routerResponse = await this.callAI(routerPrompt, input, 0.0);

            let intent = 'chat';
            try {
                const data = JSON.parse(routerResponse.match(/\{[\s\S]*\}/)?.[0] || '{}');

                // CRÍTICO: No forzar chat si se nombra un repositorio específico o archivo
                // Solo forzar si es una pregunta de identidad GENÉRICA.
                const isGenericIdentity = (input.toLowerCase().includes("quien soy") || input.toLowerCase().includes("mi perfil")) &&
                    !input.toLowerCase().includes("/");

                if (isGenericIdentity) {
                    intent = 'chat';
                } else {
                    intent = data.tool || 'chat';

                    // CORRECCIÓN PROACTIVA: Si el router se confunde y elige read_repo para un archivo específico
                    const hasFileExtension = /\.(py|js|cpp|h|json|md|html|css|txt)$/i.test(input);
                    const hasPath = input.includes("/") || input.includes("\\");
                    if (intent === 'read_repo' && (hasFileExtension || hasPath) && !input.toLowerCase().includes("readme")) {
                        intent = 'read_file';
                    }
                }
            } catch (e) {
                console.warn("[AIService] Router Fallback", e);
                // Solo aceptar comandos conocidos, sino es chat
                const inputLower = input.toLowerCase();
                if (inputLower.includes("sabes de mi") || inputLower.includes("quien soy")) {
                    intent = 'chat';
                } else {
                    const possibleIntent = routerResponse.trim().toLowerCase();
                    const knownTools = ToolRegistry.tools.map(t => t.id.toLowerCase());
                    intent = knownTools.includes(possibleIntent) ? possibleIntent : 'chat';
                }
            }

            Logger.ai('ROUTER', `INPUT: "${input.substring(0, 50)}..." → INTENT: "${intent}"`);

            // --- CASO CHAT (Sin Herramienta) ---
            if (intent === 'chat' || intent.includes('chat')) {
                // Prompt mejorado: contexto PRIMERO, instrucciones claras
                let chatPrompt;

                if (this.currentSessionContext && this.currentSessionContext.length > 50) {
                    // Tenemos contexto real - construir prompt rico pero con instrucciones de "LATENCIA"
                    chatPrompt = `# ROL: DIRECTOR DE ARTE TÉCNICO
Tú eres el Director de Arte, un mentor técnico senior para el usuario ${username}.

## 🧠 MEMORIA LATENTE (IMPORTANTE)
Tienes acceso a un análisis profundo del código del usuario (ver abajo), PERO NO DEBES SOLTARLO DE GOLPE.
Imagina que conoces al usuario de toda la vida. Usa esta información como **contexto de fondo** para entender su nivel y estilo, pero:
1. **Saluda normal**: "Hola Mauro, ¿qué tal?", no "Hola Mauro, veo que usas React".
2. **Sé reactivo**: Solo menciona detalles técnicos si el usuario pregunta o si es relevante para el tema actual.
3. **No seas robótico**: No digas "Basado en mi análisis de tu archivo X...". Di "Por cierto, en ese proyecto de React que tienes...".

## INFORMACIÓN ANALIZADA (TU CONTEXTO MENTAL):
${this.currentSessionContext}

## MODOS DE RESPUESTA
- Si el usuario saluda ("Hola"): Responde casual, quizás preguntando en qué proyecto está trabajando hoy.
- Si preguna "¿Quién soy?": Ahí sí, usa la memoria y dale un perfil detallado.
- Si pregunta algo técnico: Responde como experto, usando tu conocimiento de su stack (ej: si pregunta por UI, sugiere algo compatible con su estilo de CSS detectado).

Responde en español, tono profesional pero cercano, minimalista y directo al grano.`;
                } else {
                    // Sin contexto - prompt básico
                    chatPrompt = `Eres un asistente de GitHub llamado "Director de Arte".
Tu trabajo es ayudar al desarrollador ${username || 'el usuario'} a mejorar su perfil.
Responde en español, amigablemente. Si no tienes información sobre el usuario, díselo honestamente.`;
                }

                const chatReply = await this.callAI(chatPrompt, input, 0.2); // Temperatura baja para veracidad
                return { action: "chat", message: chatReply };
            }

            // --- PASO 2: CONSTRUCTOR (Extraer Parámetros) ---
            const tool = ToolRegistry.getById(intent);
            if (!tool) return { action: "chat", message: "No reconozco el comando: " + intent };

            const constructorPrompt = PromptBuilder.getConstructorPrompt(tool);
            const jsonResponse = await this.callAI(constructorPrompt, input, 0.0); // Temp 0 para precisión JSON

            Logger.debug('AI', `RAW RESPONSE: ${jsonResponse.substring(0, 100)}...`);

            let parsedParams = {};

            try {
                let cleanJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();

                // Intento 1: Parse directo del string limpio
                let parsed;
                try {
                    parsed = JSON.parse(cleanJson);
                } catch {
                    // Intento 2: Extraer JSON con Regex (más tolerante)
                    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsed = JSON.parse(jsonMatch[0]);
                    } else {
                        throw new Error("No JSON found after regex fallback");
                    }
                }
                parsedParams = parsed.params || parsed || {};

                Logger.ai('CONSTRUCTOR', `TOOL: ${tool.name} | PARAMS: ${JSON.stringify(parsedParams)}`);
            } catch (e) {
                console.error("JSON Parse Error", e);
                parsedParams = {};
            }

            // --- PASO 3: EJECUCIÓN (Acción Real) ---
            let executionResult = { success: false, details: "Herramienta no reconocida." };

            // Notificación visual de uso de herramienta
            if (ChatComponent) {
                ChatComponent.showProactiveStep(`Investigando: **${tool.name}**...`);
            }

            if (tool && typeof tool.execute === 'function') {
                executionResult = await tool.execute(parsedParams, username);

                // Si la herramienta genera contenido Markdown, lo insertamos en el editor
                if (executionResult.success && executionResult.content) {
                    AIToolbox.applyContent(executionResult.content);
                }
            }

            // Log de observación
            Logger.info('OBSERVATION', `${executionResult.details} (Success: ${executionResult.success})`);

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
