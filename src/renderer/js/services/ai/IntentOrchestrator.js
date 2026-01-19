/**
 * IntentOrchestrator - Orchestrates high-level intent processing and tool flow
 * Extracted from AIService to comply with SRP
 *
 * SOLID Principles:
 * - S: Only orchestrates intent processing and tool execution
 * - O: Extensible to new intent types and tools
 * - L: N/A
 * - I: Clean interface for intent processing
 * - D: Depends on specialized modules for routing, prompting, and tool execution
 */

import { logManager } from '../../utils/logManager.js';
import { ToolRegistry } from '../toolRegistry.js';
import { PromptBuilder } from '../promptBuilder.js';
import { AIToolbox } from '../aiToolbox.js';
import { ChatComponent } from '../../components/chatComponent.js';
import { SystemEventHandler } from './SystemEventHandler.js';
import { ChatPromptBuilder } from './ChatPromptBuilder.js';
import { IntentRouter } from './IntentRouter.js';
import { ParameterConstructor } from './ParameterConstructor.js';
import { AISlotPriorities } from './AISlotManager.js';

export class IntentOrchestrator {
    constructor(aiClient, contextManager) {
        this.logger = logManager.child({ component: 'IntentOrchestrator' });
        this.aiClient = aiClient;
        this.contextManager = contextManager;
    }

    /**
     * Process user intent and orchestrate response
     */
    async processIntent(input, username) {
        try {
            let thought = null;
            let whisper = null;
            let intent = 'chat';
            let searchTerms = [];
            let memorySource = null;

            // 1. Brain Phase (Router or System Handler)
            let intentParams = {};
            if (SystemEventHandler.isSystemEvent(input)) {
                const brainResult = await SystemEventHandler.handle(input, username, this.contextManager.getCurrentContext(), this.aiClient.callAI.bind(this.aiClient));
                thought = brainResult.thought;
                whisper = brainResult.whisper;
            } else {
                const routerResult = await IntentRouter.route(input, this.contextManager.getCurrentContext(), this.aiClient.callAI.bind(this.aiClient));
                intent = routerResult.intent;
                intentParams = routerResult.params || {};
                searchTerms = routerResult.searchTerms;
                memorySource = routerResult.memorySource;
                thought = routerResult.thought;
                whisper = routerResult.whisper;
            }

            // 2. Vocalization Phase (Chat Flow) - URGENT priority for instant response
            if (intent === 'chat') {
                const systemPrompt = ChatPromptBuilder.build(username, this.contextManager.getCurrentContext(), thought, whisper);
                const response = await this.aiClient.callAI(systemPrompt, input, 0.2, null, null, AISlotPriorities.URGENT);
                return { action: "chat", message: response };
            }

            // 3. Tool Flow
            const tool = ToolRegistry.getById(intent);
            if (!tool) return { action: "chat", message: `Command not recognized: ${intent}` };

            // Build params: Use Router's direct params if available, else use Constructor
            let params = (Object.keys(intentParams).length > 0)
                ? intentParams
                : await ParameterConstructor.construct(input, tool, this.aiClient.callAI.bind(this.aiClient));

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
                this.contextManager.injectRAGContext(executionResult.systemContext);
            } else if (intent !== 'query_memory' && intent !== 'chat') {
                // Clear RAG context on context switch (other tools)
                this.contextManager.clearRAGContext();
            }

            // Handle Content Injection (Editor)
            if (executionResult.success && executionResult.content) {
                AIToolbox.applyContent(executionResult.content);
            }

            const detailsSafe = typeof executionResult.details === 'object' ? JSON.stringify(executionResult.details, null, 2) : executionResult.details;
            this.logger.info(`OBSERVATION: ${detailsSafe} (Success: ${executionResult.success})`);

            // 4. Respondent Phase (Closed Loop)
            let responsePrompt;
            if (tool.id === 'query_memory') {
                // RAG Special Case: Use the Chat Persona with whisper
                responsePrompt = ChatPromptBuilder.build(username, this.contextManager.getCurrentContext(), thought, whisper);
            } else {
                // Standard Action Reporting with whisper injection
                responsePrompt = PromptBuilder.getPostActionPrompt(tool.name, executionResult, input);
                if (whisper) {
                    responsePrompt += `\n\n[STRATEGIC WHISPER]\n"${whisper}"`;
                }
            }

            const finalMessage = await this.aiClient.callAI(responsePrompt, input, 0.7);

            return {
                action: "chat",
                message: finalMessage,
                meta: {
                    thought,
                    intent,
                    whisper,
                    searchTerms,
                    memorySource
                }
            };

        } catch (error) {
            this.logger.error(`IntentOrchestrator Error: ${error.message}`, { error: error.stack });
            return { action: "chat", message: `Technical error: ${error.message || error}` };
        }
    }
}
