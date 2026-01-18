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
 * Refactored to use SOLID composition: ContextManager, AIClient, IntentOrchestrator.
 *
 * SOLID Principles:
 * - S: Facade that orchestrates specialized modules
 * - O: Extensible via module composition
 * - L: N/A
 * - I: Clean public interface
 * - D: Depends on abstractions (injected modules)
 */
import { EmbeddingService } from './ai/EmbeddingService.js';
import { ContextManager } from './ai/ContextManager.js';
import { AIClient } from './ai/AIClient.js';
import { IntentOrchestrator } from './ai/IntentOrchestrator.js';

if (typeof window !== 'undefined') {
    window.AI_OFFLINE = true;
}

export const AIService = {
    // Compose specialized modules
    _contextManager: new ContextManager(),
    _aiClient: new AIClient(),
    _intentOrchestrator: null,
    _embeddingService: new EmbeddingService(),

    // Initialize lazy-loaded orchestrator
    _getIntentOrchestrator() {
        if (!this._intentOrchestrator) {
            this._intentOrchestrator = new IntentOrchestrator(this._aiClient, this._contextManager);
        }
        return this._intentOrchestrator;
    },

    // Backward compatibility properties
    get currentSessionContext() {
        return this._contextManager.getCurrentContext();
    },

    setSessionContext(context) {
        this._contextManager.setBaseContext(context);
    },

    injectRAGContext(contextBlock) {
        this._contextManager.injectRAGContext(contextBlock);
    },

    clearRAGContext() {
        this._contextManager.clearRAGContext();
    },

    // Keep rebuildContext for backward compatibility (delegates to ContextManager)
    rebuildContext() {
        this._contextManager.rebuildContext();
    },

    async processIntent(input, username) {
        return await this._getIntentOrchestrator().processIntent(input, username);
    },

    async callAI(systemPrompt, userMessage, temperature, format = null, schema = null, priority = 'URGENT') {
        return await this._aiClient.callAI(systemPrompt, userMessage, temperature, format, schema, priority);
    },

    async callAI_CPU(systemPrompt, userMessage, temperature, format = null, schema = null) {
        return await this._aiClient.callAI_CPU(systemPrompt, userMessage, temperature, format, schema);
    },

    async getEmbedding(text) {
        return this._embeddingService.getEmbedding(text);
    },

    async batchEmbeddings(texts) {
        return this._embeddingService.batchEmbeddings(texts);
    },

    updateHealth(isOnline) {
        this._aiClient.updateHealth(isOnline);
    },

    startHealthCheck() {
        this._aiClient.startHealthCheck();
    }
};

AIService.startHealthCheck();
