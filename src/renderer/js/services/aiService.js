/**
 * AIService - Centralizes AI intelligence and intent processing.
 * Follows Single Responsibility Principle (SOLID).
 * REFACTORED: Delegates to SystemEventHandler and ChatPromptBuilder
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { ToolRegistry } from './toolRegistry.js';
import { PromptBuilder } from './promptBuilder.js';
import { AIToolbox } from './aiToolbox.js';
import { ChatComponent } from '../components/chatComponent.js';
import { SystemEventHandler } from './ai/SystemEventHandler.js';
import { ChatPromptBuilder } from './ai/ChatPromptBuilder.js';

// Initial state: Silent until proven otherwise
if (typeof window !== 'undefined') {
    window.AI_OFFLINE = true;
}

export const AIService = {
    currentSessionContext: "", // Memory of deep scan findings
    _hasLoggedOnline: false, // Throttle: only log AI status once

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
            // Delegate to SystemEventHandler module
            if (SystemEventHandler.isSystemEvent(input)) {
                return await SystemEventHandler.handle(
                    input,
                    username,
                    this.currentSessionContext,
                    this.callAI.bind(this)
                );
            }

            // --- AUTO-LOAD PERSISTENT MEMORY ---
            if (!this.currentSessionContext) {
                const dna = await CacheRepository.getDeveloperDNA(username);
                if (dna) {
                    const analyzer = new ProfileAnalyzer();
                    this.currentSessionContext = analyzer.getFreshContext(username, dna);
                    Logger.info('AIService', 'Deep memory recovered from cache.');
                } else {
                    Logger.warn('AIService', `No DNA found for ${username}.Running without context.`);
                }
            }

            // --- STEP 1: ROUTER (Identify Intent) ---
            const routerPrompt = PromptBuilder.getRouterPrompt(ToolRegistry.tools) +
                (this.currentSessionContext ? `\nCURRENT CONTEXT: ${this.currentSessionContext} ` : "");
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
                // Delegate to ChatPromptBuilder
                const chatPrompt = ChatPromptBuilder.build(username, this.currentSessionContext);
                const chatReply = await this.callAI(chatPrompt, input, 0.2);
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
            // NOISE REDUCTION: Silent operation, only log errors or first success
            // console.log(`[AIService] Calling AI... (Temp: ${temperature}, Format: ${format})`);

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

            // NOISE REDUCTION: Only log status on first success or on error
            if (!response.ok) {
                console.error(`[AIService] ❌ Response ERROR: ${response.status}`);
            } else if (!this._hasLoggedOnline) {
                console.log(`[AIService] ✅ AI Server ONLINE (Status: ${response.status})`);
                this._hasLoggedOnline = true;
            }

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Local LFM Error: ${response.status} - ${err}`);
            }

            const data = await response.json();
            this.setAIStatus(true); // Connected
            return data.choices[0].message.content;

        } catch (error) {
            this.setAIStatus(false); // Disconnected
            this._hasLoggedOnline = false; // Reset so next success will log
            console.error("[AIService] ❌ Critical AI Error:", error.message || error);
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
