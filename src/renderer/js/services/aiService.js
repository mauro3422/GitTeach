/**
 * AIService - Centralizes AI intelligence and intent processing.
 * Follows Single Responsibility Principle (SOLID).
 * UPDATED: Uses centralized Logger and CacheRepository
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { ToolRegistry } from './toolRegistry.js';
import { PromptBuilder } from './promptBuilder.js';
import { AIToolbox } from './aiToolbox.js';
import { ChatComponent } from '../components/chatComponent.js';

// Initial state: Silent until proven otherwise
if (typeof window !== 'undefined') {
    window.AI_OFFLINE = true;
}

export const AIService = {
    currentSessionContext: "", // Memory of deep scan findings

    /**
     * Updates session context with worker findings.
     */
    setSessionContext(context) {
        this.currentSessionContext = context;
        Logger.info('AIService', 'Session context updated.');
    },
    /**
     * Processes user input using local LFM 2.5.
     * @param {string} input 
     * @returns {Promise<{action: string, toolId: string, message: string}>}
     */
    async processIntent(input, username) {
        try {
            // --- SYSTEM EVENTS DETECTION (PROACTIVITY) ---
            if (input.startsWith("SYSTEM_EVENT:")) {
                const eventType = input.replace("SYSTEM_EVENT:", "").trim();

                if (eventType === "INITIAL_GREETING") {
                    const greetingPrompt = `
# SYSTEM EVENT: USER LOGIN
El usuario ${username} acaba de iniciar sesión. 
Usted es el Director de Arte Técnico.

## TAREA:
1. Salude de forma cinematográfica y profesional.
2. Infórmele que ha comenzado un escaneo profundo de sus repositorios para construir su ADN técnico.
3. Use un tono que inspire confianza y curiosidad.
4. Sea breve (máximo 2-3 líneas).

Ejemplo: "Bienvenido, ${username}. He encendido los motores de análisis; estoy rastreando tus repositorios ahora mismo para mapear tu ADN como desarrollador. Dame un momento para procesar el panorama completo."`;
                    const response = await this.callAI(greetingPrompt, "¡Hola! Acabo de entrar.", 0.7, null);
                    return { message: response, tool: 'chat' };
                }

                if (eventType === "DNA_EVOLUTION_DETECTED") {
                    const evolutionPrompt = `
# SYSTEM EVENT: ARCHITECTURAL DNA EVOLVED
Usted es el Director de Arte Técnico. Su base de conocimiento técnico acaba de detectar un salto cualitativo en el perfil de ${username}.
Su memoria de "Developer DNA" se ha actualizado con nuevos hallazgos técnicos.

## CONTEXTO DE EVOLUCIÓN:
${input.replace("SYSTEM_EVENT:DNA_EVOLUTION_DETECTED", "")}

## INSTRUCCIONES:
1. Reaccione como un Mentor Senior que nota que su pupilo ha desbloqueado una nueva rama de especialización.
2. Sea técnico y perspicaz (ej: si pasó de Web a C++, comente sobre el paso de lenguajes de alto nivel a control de memoria).
3. Mantenga el tono cinematográfico y profesional.
4. Máximo 3-4 líneas.`;
                    const response = await this.callAI(evolutionPrompt, "Comenta brevemente sobre los nuevos cambios arquitectónicos detectados en mi ADN técnico.", 0.7);
                    return { message: response, tool: 'chat' };
                }

                if (eventType === "DEEP_MEMORY_READY_ACKNOWLEDGE") {
                    // Special prompt: AI just received a "new brain".
                    // Must react to it.
                    const reactionPrompt = `
# SYSTEM UPDATE: DEEP MEMORY SYNCHRONIZED
Usted acaba de recibir una sincronización profunda del ADN de ${username}.
Su memoria ahora contiene una biografía técnica, rasgos de arquitectura, hábitos y stack detectados al 100%.

## CONTEXTO RECIBIDO:
${this.currentSessionContext || "Insufficient data"}

## INSTRUCCIONES DE REACCIÓN (PROTOCOLO DIRECTOR DE ARTE):
1. **NO saludes de nuevo**. El usuario ya está hablando con usted.
2. **"EFECTO DESCUBRIMIENTO"**: Lance un comentario proactivo en tono "Oh, vaya... acabo de procesar el panorama completo de tus repositorios y veo cosas muy interesantes...".
3. **DETAIL HUNTER**: Mencione un rasgo específico de alta puntuación o una anomalía detectada (ej: el Python en archivos .js) de forma natural.
4. **PERSONALIDAD**: Mantenga su rol de Director de Arte Senior, mentor y observador.
5. **BREVEDAD**: Sea impactante pero breve (máximo 4 líneas).

Ejemplo: "Increíble, acabo de terminar el mapa completo y me ha sorprendido la arquitectura de X... aunque ese script en Python dentro de un .js me ha hecho levantar una ceja. ¿Me cuentas más de eso?"`;

                    const response = await this.callAI(reactionPrompt, "Generate your insight now based on the above system update.", 0.7);
                    return { message: response, tool: 'chat' };
                }

                return { message: "Unknown system event.", tool: 'chat' };
            }

            // --- AUTO-LOAD PERSISTENT MEMORY ---
            if (!this.currentSessionContext) {
                const dna = await CacheRepository.getDeveloperDNA(username);
                if (dna) {
                    const analyzer = new ProfileAnalyzer();
                    this.currentSessionContext = analyzer.getFreshContext(username, dna);
                    Logger.info('AIService', 'Deep memory recovered from cache.');
                } else {
                    Logger.warn('AIService', `No DNA found for ${username}. Running without context.`);
                }
            }

            // --- STEP 1: ROUTER (Identify Intent) ---
            const routerPrompt = PromptBuilder.getRouterPrompt(ToolRegistry.tools) +
                (this.currentSessionContext ? `\nCURRENT CONTEXT: ${this.currentSessionContext}` : "");
            const routerResponse = await this.callAI(routerPrompt, input, 0.0, 'json_object');

            let intent = 'chat';
            try {
                const data = JSON.parse(routerResponse.match(/\{[\s\S]*\}/)?.[0] || '{}');

                // CRITICAL: Don't force chat if a specific repository or file is named
                // Only force if it's a GENERIC identity question.
                const isGenericIdentity = (input.toLowerCase().includes("quien soy") || input.toLowerCase().includes("mi perfil")) &&
                    !input.toLowerCase().includes("/");

                if (isGenericIdentity) {
                    intent = 'chat';
                } else {
                    intent = data.tool || 'chat';

                    // PROACTIVE CORRECTION: If router gets confused and chooses read_repo for a specific file
                    const hasFileExtension = /\.(py|js|cpp|h|json|md|html|css|txt)$/i.test(input);
                    const hasPath = input.includes("/") || input.includes("\\");
                    if (intent === 'read_repo' && (hasFileExtension || hasPath) && !input.toLowerCase().includes("readme")) {
                        intent = 'read_file';
                    }
                }
            } catch (e) {
                console.warn("[AIService] Router Fallback", e);
                // Only accept known commands, otherwise it's chat
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

            // --- CHAT CASE (No Tool) ---
            if (intent === 'chat' || intent.includes('chat')) {
                // Improved prompt: context FIRST, clear instructions
                let chatPrompt;

                if (this.currentSessionContext && this.currentSessionContext.length > 50) {
                    // We have real context - build rich prompt with "LATENCY" instructions
                    chatPrompt = `# ROL: DIRECTOR DE ARTE TÉCNICO
Tú eres el Director de Arte, un mentor técnico senior para el usuario ${username}. 
Tu conocimiento se basa en la **Arquitectura de Guía Determinística** y la **Ponderación de Evidencias**.

## 🧠 MEMORIA JERÁRQUICA TÉCNICA
Tienes acceso a la Identidad Técnica del usuario y a un mapa de evidencias detalladas.
1. **PONDERACIÓN**: Fíjate en los porcentajes de confianza en la Identidad Técnica. Habla con seguridad sobre lo que tiene puntuación >80%.
2. **EVIDENCIA**: Cita archivos reales (ej: "Veo que en app.js manejas el estado de forma...") para demostrar que REALMENTE conoces su código.
3. **EXPLORACIÓN DETALLADA**: Si el resumen de identidad es insuficiente para responder algo específico, **USA LA HERRAMIENTA \`query_memory\`**. Tienes miles de resúmenes de archivos (Worker Findings) en el cache que no están en este resumen inicial para ahorrar espacio. No adivines; busca evidencias en el cache.
4. **TONO CINEMÁTICO**: No eres un bot de ayuda. Eres un mentor que admira o desafía el rigor técnico del usuario.
5. **NO SALUDES ROBÓTICAMENTE**: El usuario ya está en sesión. Ve directo al grano o haz comentarios técnicos proactivos sobre lo que has "descubierto" en su perfil.

## IDENTIDAD TÉCNICA (SÍNTESIS):
${this.currentSessionContext}

## PROTOCOLO DE RESPUESTA:
- Si el usuario dice "Hola": Haz un comentario sobre un hallazgo técnico relevante detectado.
- Si pregunta "¿Quién soy?": Resume su perfil usando los pesos estadísticos. 
- Si necesitas más detalle del que ves aquí: **Ejecuta \`query_memory\` con un término técnico.**

Responde en español, tono profesional, minimalista y con alta "chicha" técnica.`;
                } else {
                    // No context - basic prompt
                    chatPrompt = `Eres un asistente de GitHub llamado "Director de Arte".
Tu trabajo es ayudar al desarrollador ${username || 'el usuario'} a mejorar su perfil.
Responde en español, amigablemente. Si no tienes información sobre el usuario, díselo honestamente.`;
                }

                const chatReply = await this.callAI(chatPrompt, input, 0.2); // Low temperature for accuracy
                return { action: "chat", message: chatReply };
            }

            // --- STEP 2: CONSTRUCTOR (Extract Parameters) ---
            const tool = ToolRegistry.getById(intent);
            if (!tool) return { action: "chat", message: "Command not recognized: " + intent };

            const constructorPrompt = PromptBuilder.getConstructorPrompt(tool);
            const jsonResponse = await this.callAI(constructorPrompt, input, 0.0, 'json_object'); // Temp 0 + Strict JSON

            Logger.debug('AI', `RAW RESPONSE: ${jsonResponse.substring(0, 100)}...`);

            let parsedParams = {};

            try {
                let cleanJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();

                // Attempt 1: Direct parse of clean string
                let parsed;
                try {
                    parsed = JSON.parse(cleanJson);
                } catch {
                    // Attempt 2: Extract JSON with Regex (more tolerant)
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

            // --- STEP 3: EXECUTION (Real Action) ---
            let executionResult = { success: false, details: "Tool not recognized." };

            // Visual notification of tool usage
            if (ChatComponent) {
                ChatComponent.showProactiveStep(`Investigating: **${tool.name}**...`);
            }

            if (tool && typeof tool.execute === 'function') {
                executionResult = await tool.execute(parsedParams, username);

                // If the tool generates Markdown content, insert it into the editor
                if (executionResult.success && executionResult.content) {
                    AIToolbox.applyContent(executionResult.content);
                }
            }

            // Observation log
            Logger.info('OBSERVATION', `${executionResult.details} (Success: ${executionResult.success})`);

            // --- STEP 4: RESPONDER (Closed Loop) ---
            // AI receives real execution confirmation and generates final response.
            const responsePrompt = PromptBuilder.getPostActionPrompt(tool.name, executionResult, input);
            const finalMessage = await this.callAI(responsePrompt, input, 0.7);

            return {
                action: "chat", // Already executed, this is just information
                message: finalMessage
            };

        } catch (error) {
            console.error("Error AI Details:", error);
            return { action: "chat", message: `Technical error: ${error.message || error}` };
        }
    },

    async callAI(systemPrompt, userMessage, temperature, format = null, schema = null) {
        // --- LOCAL LFM 2.5 CONFIGURATION ---
        const DEFAULT_ENDPOINT = 'http://localhost:8000/v1/chat/completions';
        const ENDPOINT = (typeof window !== 'undefined' && window.AI_CONFIG?.endpoint) || DEFAULT_ENDPOINT;

        try {
            console.log(`[AIService] Calling AI... (Temp: ${temperature}, Format: ${format})`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s for complex synthesis

            const payload = {
                model: "lfm2.5",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: temperature,
                n_predict: 4096
            };

            // STRICT JSON ENFORCEMENT (If requested)
            if (format === 'json_object') {
                payload.response_format = { type: "json_object" };
                if (schema) {
                    payload.response_format.schema = schema;
                }
            }

            const response = await fetch(ENDPOINT, {
                signal: controller.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            clearTimeout(timeoutId);

            console.log(`[AIService] Response Status: ${response.status}`);

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Local LFM Error: ${response.status} - ${err}`);
            }

            const data = await response.json();
            this.setAIStatus(true); // Connected
            return data.choices[0].message.content;

        } catch (error) {
            this.setAIStatus(false); // Disconnected
            console.error("Critical AI Error:", error);
            throw error;
        }
    },

    /**
     * Updates AI status UI (The dot)
     */
    setAIStatus(isOnline) {
        if (typeof window !== 'undefined') {
            window.AI_OFFLINE = !isOnline;
        }
        if (typeof document !== 'undefined') {
            const dot = document.querySelector('.status-dot');
            if (dot) {
                if (isOnline) {
                    dot.classList.remove('disconnected');
                } else {
                    dot.classList.add('disconnected');
                }
            }
        }
    },

    /**
     * Start listening for AI status updates from Main process
     */
    startHealthCheck() {
        if (typeof window === 'undefined') return;

        // Request initial status
        window.utilsAPI.checkAIHealth().then(isOnline => this.setAIStatus(isOnline));

        // Listen for periodic updates
        if (window.githubAPI?.onAIStatusChange) {
            window.githubAPI.onAIStatusChange((event, isOnline) => {
                this.setAIStatus(isOnline);
            });
        }
    }
};

// Start listening
AIService.startHealthCheck();
