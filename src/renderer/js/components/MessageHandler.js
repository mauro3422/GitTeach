/**
 * MessageHandler.js
 * Handles the message lifecycle and AI intent processing
 * Delegates session state management to ChatStateManager
 */

import { ChatStateManager } from './ChatStateManager.js';

export class MessageHandler {
    constructor(chatStateManager) {
        this.chatStateManager = chatStateManager || new ChatStateManager();
    }

    /**
     * Send a message and process AI response
     */
    async sendMessage(text, addMessageCallback, addLoadingCallback, removeLoadingCallback) {
        if (this.chatStateManager.isCurrentlyProcessing()) return;

        console.log("[MessageHandler] Sending message:", text);
        if (window.githubAPI?.logToTerminal) window.githubAPI.logToTerminal(`💬 Chat Input: ${text}`);

        // Add to message history
        this.chatStateManager.addToHistory(text, 'user');

        addMessageCallback(text, 'user');
        await this.processAIResponse(text, addLoadingCallback, removeLoadingCallback, addMessageCallback);
    }

    /**
     * Process AI response for user input
     */
    async processAIResponse(userInput, addLoadingCallback, removeLoadingCallback, addMessageCallback) {
        const startTime = Date.now();
        this.chatStateManager.setProcessing(true);
        this.chatStateManager.setConnectionStatus('connecting');
        addLoadingCallback();

        try {
            const { AIService } = await import('../services/aiService.js');
            const { ToolRegistry } = await import('../services/toolRegistry.js');
            const { AIToolbox } = await import('../services/aiToolbox.js');
            const { DashboardView } = await import('../views/dashboard.js');

            const usernameEl = document.getElementById('user-name');
            const username = usernameEl?.dataset.login || DashboardView.currentUsername || 'User';
            const intent = await AIService.processIntent(userInput, username);

            const responseTime = Date.now() - startTime;
            this.chatStateManager.recordSuccessfulRequest(responseTime);
            this.chatStateManager.setConnectionStatus('connected');
            this.chatStateManager.resetRetryCount();

            removeLoadingCallback();

            // La "Acción" ya se ejecutó dentro del servicio (Ciclo Cerrado).
            // Solo mostramos el mensaje final del AI Report.
            console.log("[MessageHandler] Respuesta AI recibida:", intent.message);

            // Add AI response to history
            this.chatStateManager.addToHistory(intent.message, 'ai');

            // Debug logging - capture AI response
            if (window.DebugLogger) {
                window.DebugLogger.logChat('ai', intent.message);
            }

            addMessageCallback(intent.message, 'ai');
        } catch (error) {
            console.error("[MessageHandler] Error procesando AI:", error);
            if (window.githubAPI?.logToTerminal) window.githubAPI.logToTerminal(`❌ Chat Error: ${error.message}`);

            this.chatStateManager.recordFailedRequest();
            this.chatStateManager.setConnectionStatus('error');
            this.chatStateManager.incrementRetryCount();

            removeLoadingCallback();
            addMessageCallback("Ups, perdí la conexión con mi motor local. ¿Está el servidor encendido?", 'ai');
            console.error('MessageHandler Error:', error);
        } finally {
            this.chatStateManager.setProcessing(false);
        }
    }

    /**
     * Check if currently processing
     */
    isCurrentlyProcessing() {
        return this.chatStateManager.isCurrentlyProcessing();
    }
}

// Export singleton instance
export const messageHandler = new MessageHandler();
