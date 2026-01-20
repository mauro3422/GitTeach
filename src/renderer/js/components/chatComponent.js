/**
 * ChatComponent.js
 * Clean entry point orchestrating UI, Messages, and State
 * Coordinates ChatUI, MessageHandler, ProactiveMessenger, and ChatStateManager
 */

import { ChatStateManager } from './ChatStateManager.js';
import { MessageHandler } from './MessageHandler.js';
import { chatUI } from './ChatUI.js';
import { proactiveMessenger } from './ProactiveMessenger.js';

export const ChatComponent = {
    // Shared state manager instance
    stateManager: null,
    messageHandler: null,

    init() {
        // Initialize shared state manager
        this.stateManager = new ChatStateManager();
        this.stateManager.init();

        // Initialize message handler with shared state
        this.messageHandler = new MessageHandler(this.stateManager);

        // Initialize ChatUI
        if (!chatUI.initialize()) {
            return;
        }

        // Connect components
        proactiveMessenger.chatUI = chatUI;
        proactiveMessenger.stateManager = this.stateManager;

        // Setup callbacks with shared message handler
        chatUI.setMessageSendCallback((message) => {
            if (!this.messageHandler.isCurrentlyProcessing()) {
                this.messageHandler.sendMessage(
                    message,
                    (text, type) => chatUI.addMessage(text, type),
                    () => chatUI.addLoadingMessage(),
                    () => chatUI.removeLoading()
                );
            }
        });

        chatUI.setQuickActionCallback((query) => {
            if (!this.messageHandler.isCurrentlyProcessing()) {
                this.messageHandler.sendMessage(
                    query,
                    (text, type) => chatUI.addMessage(text, type),
                    () => chatUI.addLoadingMessage(),
                    () => chatUI.removeLoading()
                );
            }
        });

        console.log('[ChatComponent] Initialized with coordinated state management.');
    },

    // Delegate methods to specialized handlers
    showProactiveStep(message) {
        proactiveMessenger.showProactiveStep(message);
    },

    showInsight(message) {
        proactiveMessenger.showInsight(message);
    },

    updateProgress(percent, text) {
        chatUI.updateProgress(percent, text);
    },

    hideProgress() {
        chatUI.hideProgress();
    },

    // Additional proactive methods through ProactiveMessenger
    showScanningProgress(repoName, current, total) {
        proactiveMessenger.showScanningProgress(repoName, current, total);
    },

    showAnalysisComplete(repoName, filesCount) {
        proactiveMessenger.showAnalysisComplete(repoName, filesCount);
    },

    showAIProcessing(status) {
        proactiveMessenger.showAIProcessing(status);
    },

    showError(errorType, details) {
        proactiveMessenger.showError(errorType, details);
    },

    showSuccess(message) {
        proactiveMessenger.showSuccess(message);
    },

    showWarning(message) {
        proactiveMessenger.showWarning(message);
    },

    showInfo(message) {
        proactiveMessenger.showInfo(message);
    },

    showMemoryUpdate(memoryType, count) {
        proactiveMessenger.showMemoryUpdate(memoryType, count);
    },

    showPipelineStatus(stage, progress) {
        proactiveMessenger.showPipelineStatus(stage, progress);
    }
};
