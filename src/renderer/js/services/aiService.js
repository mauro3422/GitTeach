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
import { ProfileAnalyzer } from './profileAnalyzer.js';
import { ChatComponent } from '../components/chatComponent.js';

// Initial state: Silent until proven otherwise
window.AI_OFFLINE = true;

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

                if (eventType === "DEEP_MEMORY_READY_ACKNOWLEDGE") {
                    // Special prompt: AI just received a "new brain".
                    // Must react to it.
                    const reactionPrompt = `
# SYSTEM UPDATE: DEEP MEMORY SYNCHRONIZED
You just received a massive code analysis from ${username}.
Your new memory contains:
${this.currentSessionContext || "Insufficient data"}

## YOUR TASK:
Don't greet again. Simply launch an "Insight" or interesting comment about what you just discovered.
Examples:
- "Wow, I didn't know you used X pattern in project Y."
- "I see you really like Python, but your C++ folder structure is very clean."
- "Interesting mix of technologies in [Repo]."

Be brief, natural and direct. Surprise the user with your proactivity.`;

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
            const routerResponse = await this.callAI(routerPrompt, input, 0.0);

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
            const jsonResponse = await this.callAI(constructorPrompt, input, 0.0); // Temp 0 for JSON precision

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

    async callAI(systemPrompt, userMessage, temperature) {
        // --- LOCAL LFM 2.5 CONFIGURATION ---
        // Configurable endpoint via window.AI_CONFIG or default value
        const DEFAULT_ENDPOINT = 'http://localhost:8000/v1/chat/completions';
        const ENDPOINT = window.AI_CONFIG?.endpoint || DEFAULT_ENDPOINT;

        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "lfm2.5", // Local model name
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
        window.AI_OFFLINE = !isOnline;
        const dot = document.querySelector('.status-dot');
        if (dot) {
            if (isOnline) {
                dot.classList.remove('disconnected');
            } else {
                dot.classList.add('disconnected');
            }
        }
    },

    /**
     * Start listening for AI status updates from Main process
     */
    startHealthCheck() {
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
