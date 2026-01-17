/**
 * GitTeach - AI-Powered GitHub Profile Generator
 * Copyright (C) 2026 Mauro (mauro3422)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * See LICENSE file for details.
 */

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
import { aiSlotManager } from './ai/AISlotManager.js';
import { AISlotPriorities } from './ai/AISlotPriorities.js';
import { AIHealthMonitor } from './ai/AIHealthMonitor.js';
import { EmbeddingService } from './ai/EmbeddingService.js';

if (typeof window !== 'undefined') {
    window.AI_OFFLINE = true;
}

export const AIService = {
    currentSessionContext: "",
    baseContext: "", // Persistent DNA/Identity
    ragContext: "",  // Ephemeral Query Context
    _hasLoggedOnline: false,

    // Initialize specialized modules
    _healthMonitor: new AIHealthMonitor(),
    _embeddingService: new EmbeddingService(),

    setSessionContext(context) {
        this.baseContext = context;
        this.rebuildContext();
        Logger.info('AIService', 'Session context updated (Base Identity).');
    },

    injectRAGContext(contextBlock) {
        this.ragContext = contextBlock;
        this.rebuildContext();
    },

    clearRAGContext() {
        if (this.ragContext) {
            this.ragContext = "";
            this.rebuildContext();
        }
    },

    rebuildContext() {
        const parts = [];
        if (this.baseContext) parts.push(this.baseContext);

        if (this.ragContext) {
            parts.push("\n### RELEVANT TECHNICAL MEMORY (RAG):\n" + this.ragContext);
        }

        this.currentSessionContext = parts.join('\n');

        // Safety Truncation (Max ~8k tokens -> ~32k chars safely)
        if (this.currentSessionContext.length > 32000) {
            Logger.warn('AIService', 'Context too large, truncating base...');
            // Keep RAG, truncate base
            const maxBase = 32000 - this.ragContext.length - 100;
            this.baseContext = this.baseContext.substring(0, maxBase);
            this.currentSessionContext = this.baseContext + "\n### RELEVANT TECHNICAL MEMORY (RAG):\n" + this.ragContext;
        }
    },

    async processIntent(input, username) {
        try {
            let thought = null;
            let whisper = null;
            let intent = 'chat';
            let searchTerms = [];
            let memorySource = null;

            // 1. Brain Phase (Router or System Handler)
            if (SystemEventHandler.isSystemEvent(input)) {
                const brainResult = await SystemEventHandler.handle(input, username, this.currentSessionContext, this.callAI.bind(this));
                thought = brainResult.thought;
                whisper = brainResult.whisper;
            } else {
                const routerResult = await IntentRouter.route(input, this.currentSessionContext, this.callAI.bind(this));
                intent = routerResult.intent;
                searchTerms = routerResult.searchTerms;
                memorySource = routerResult.memorySource;
                thought = routerResult.thought;
                whisper = routerResult.whisper;
            }

            // 2. Vocalization Phase (Chat Flow)
            if (intent === 'chat') {
                const systemPrompt = ChatPromptBuilder.build(username, this.currentSessionContext, thought, whisper);
                const response = await this.callAI(systemPrompt, input, 0.2);
                return { action: "chat", message: response };
            }

            // 3. Tool Flow
            const tool = ToolRegistry.getById(intent);
            if (!tool) return { action: "chat", message: `Command not recognized: ${intent}` };

            // Build params with Smart RAG fields
            let params = await ParameterConstructor.construct(input, tool, this.callAI.bind(this));

            // Inject Smart RAG params for query_memory tool
            if (intent === 'query_memory') {
                params = {
                    ...params,
                    query: params.query || input,
                    searchTerms: searchTerms.length > 0 ? searchTerms : [input],
                    memorySource: memorySource || 'curated'
                };
            }

            if (ChatComponent) ChatComponent.showProactiveStep(`Investigating: **${tool.name}**...`);

            const executionResult = await tool.execute(params, username);

            // Handle Context Injection (RAG)
            if (executionResult.success && executionResult.systemContext) {
                this.injectRAGContext(executionResult.systemContext);
            } else if (intent !== 'query_memory' && intent !== 'chat') {
                // Clear RAG context on context switch (other tools)
                this.clearRAGContext();
            }

            // Handle Content Injection (Editor)
            if (executionResult.success && executionResult.content) {
                AIToolbox.applyContent(executionResult.content);
            }

            Logger.info('OBSERVATION', `${executionResult.details} (Success: ${executionResult.success})`);

            // 4. Respondent Phase (Closed Loop)
            let responsePrompt;
            if (tool.id === 'query_memory') {
                // RAG Special Case: Use the Chat Persona with whisper
                responsePrompt = ChatPromptBuilder.build(username, this.currentSessionContext, thought, whisper);
            } else {
                // Standard Action Reporting with whisper injection
                responsePrompt = PromptBuilder.getPostActionPrompt(tool.name, executionResult, input);
                if (whisper) {
                    responsePrompt += `\n\n[STRATEGIC WHISPER]\n"${whisper}"`;
                }
            }

            const finalMessage = await this.callAI(responsePrompt, input, 0.7);

            return { action: "chat", message: finalMessage };

        } catch (error) {
            console.error("AI Service Error:", error);
            return { action: "chat", message: `Technical error: ${error.message || error}` };
        }
    },

    async callAI(systemPrompt, userMessage, temperature, format = null, schema = null, priority = AISlotPriorities.URGENT) {
        const ENDPOINT = (typeof window !== 'undefined' && window.AI_CONFIG?.endpoint) || 'http://localhost:8000/v1/chat/completions';

        await aiSlotManager.acquire(priority);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);

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

            let response;
            let attempt = 0;
            const maxRetries = 3;

            while (attempt < maxRetries) {
                try {
                    response = await fetch(ENDPOINT, { signal: controller.signal, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (response.ok) break;

                    // If 4xx error, do not retry (client error)
                    if (response.status >= 400 && response.status < 500) break;

                    throw new Error(`Server returned ${response.status}`);
                } catch (err) {
                    attempt++;
                    if (attempt >= maxRetries) throw err;

                    // Exponential backoff: 1s, 2s, 4s...
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.warn(`[AIService] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
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
        } finally {
            aiSlotManager.release();
        }
    },

    async getEmbedding(text) {
        return this._embeddingService.getEmbedding(text);
    },

    updateHealth(isOnline) {
        this._healthMonitor.updateHealth(isOnline);
    },

    startHealthCheck() {
        this._healthMonitor.startHealthCheck();
    }
};

AIService.startHealthCheck();