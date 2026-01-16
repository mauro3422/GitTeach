/**
 * AIService - Centralizes AI intelligence and intent processing (Facade).
 * Now delegating to SystemEventHandler, ChatPromptBuilder, IntentRouter, and ParameterConstructor.
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { ToolRegistry } from './toolRegistry.js';
import { PromptBuilder } from './promptBuilder.js';
import { AIToolbox } from './aiToolbox.js';
import { ChatComponent } from '../components/chatComponent.js';
import { SystemEventHandler } from './ai/SystemEventHandler.js';
import { ChatPromptBuilder } from './ai/ChatPromptBuilder.js';
import { IntentRouter } from './ai/IntentRouter.js';
import { ParameterConstructor } from './ai/ParameterConstructor.js';

if (typeof window !== 'undefined') {
    window.AI_OFFLINE = true;
}

export const AIService = {
    currentSessionContext: "",
    _hasLoggedOnline: false,

    setSessionContext(context) {
        this.currentSessionContext = context;
        Logger.info('AIService', 'Session context updated.');
    },

    async processIntent(input, username) {
        try {
            // 1. Proactive Event Handling
            if (SystemEventHandler.isSystemEvent(input)) {
                return await SystemEventHandler.handle(input, username, this.currentSessionContext, this.callAI.bind(this));
            }

            // 2. Intent Routing
            const intent = await IntentRouter.route(input, this.currentSessionContext, this.callAI.bind(this));

            // 3. Chat Flow
            if (intent === 'chat' || intent.includes('chat')) {
                const response = await this.callAI(ChatPromptBuilder.build(username, this.currentSessionContext), input, 0.2);
                return { action: "chat", message: response };
            }

            // 4. Tool Flow
            const tool = ToolRegistry.getById(intent);
            if (!tool) return { action: "chat", message: `Command not recognized: ${intent}` };

            const params = await ParameterConstructor.construct(input, tool, this.callAI.bind(this));

            if (ChatComponent) ChatComponent.showProactiveStep(`Investigating: **${tool.name}**...`);

            const executionResult = await tool.execute(params, username);
            if (executionResult.success && executionResult.content) {
                AIToolbox.applyContent(executionResult.content);
            }

            Logger.info('OBSERVATION', `${executionResult.details} (Success: ${executionResult.success})`);

            // 5. Respondent Flow (Closed Loop)
            const responsePrompt = PromptBuilder.getPostActionPrompt(tool.name, executionResult, input);
            const finalMessage = await this.callAI(responsePrompt, input, 0.7);

            return { action: "chat", message: finalMessage };

        } catch (error) {
            console.error("AI Service Error:", error);
            return { action: "chat", message: `Technical error: ${error.message || error}` };
        }
    },

    async callAI(systemPrompt, userMessage, temperature, format = null, schema = null) {
        const ENDPOINT = (typeof window !== 'undefined' && window.AI_CONFIG?.endpoint) || 'http://localhost:8000/v1/chat/completions';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);

            const payload = {
                model: "lfm2.5",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
                temperature,
                n_predict: 4096
            };

            if (format === 'json_object') {
                payload.response_format = { type: "json_object" };
                if (schema) payload.response_format.schema = schema;
            }

            const response = await fetch(ENDPOINT, { signal: controller.signal, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`[AIService] ❌ Response ERROR: ${response.status}`);
            } else if (!this._hasLoggedOnline) {
                console.log(`[AIService] ✅ AI Server ONLINE`);
                this._hasLoggedOnline = true;
            }

            if (!response.ok) throw new Error(`Status: ${response.status}`);

            const data = await response.json();
            this.updateHealth(true);
            return data.choices[0].message.content;
        } catch (error) {
            this.updateHealth(false);
            console.error("[AIService] ❌ AI Error:", error.message);
            throw error;
        }
    },

    async getEmbedding(text) {
        let ENDPOINT;
        if (typeof window !== 'undefined' && window.AI_CONFIG?.embeddingEndpoint) {
            ENDPOINT = window.AI_CONFIG.embeddingEndpoint;
        } else if (typeof window !== 'undefined' && window.AI_CONFIG?.endpoint) {
            ENDPOINT = window.AI_CONFIG.endpoint.replace('/chat/completions', '/embeddings');
        } else {
            ENDPOINT = 'http://localhost:8000/v1/embeddings';
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for embeddings

            const payload = {
                model: "lfm2.5", // Explicit model might be needed by some servers
                input: text
            };

            const response = await fetch(ENDPOINT, {
                signal: controller.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Status: ${response.status}`);

            const data = await response.json();
            if (data && data.data && data.data.length > 0) {
                return data.data[0].embedding;
            }
            return null;
        } catch (error) {
            console.warn("[AIService] ⚠️ Embedding Error:", error.message);
            return null; // Graceful fallback
        }
    },

    updateHealth(isOnline) {
        if (typeof window !== 'undefined') window.AI_OFFLINE = !isOnline;
        if (typeof document !== 'undefined') {
            const dot = document.querySelector('.status-dot');
            if (dot) isOnline ? dot.classList.remove('disconnected') : dot.classList.add('disconnected');
        }
    },

    startHealthCheck() {
        if (typeof window === 'undefined') return;
        window.utilsAPI?.checkAIHealth().then(online => this.updateHealth(online));
        window.githubAPI?.onAIStatusChange?.((e, online) => this.updateHealth(online));
    }
};

AIService.startHealthCheck();
