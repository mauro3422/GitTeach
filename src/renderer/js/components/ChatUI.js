/**
 * ChatUI.js
 * Manages DOM interactions, scrolling, and progress bar updates
 * Extracted from ChatComponent.js to comply with SRP
 */

export class ChatUI {
    constructor() {
        this.container = null;
        this.input = null;
        this.loadingBubbleId = 'ai-loading-bubble';
    }

    /**
     * Initialize DOM elements
     */
    initialize() {
        this.container = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input-box');

        if (!this.container || !this.input) {
            console.error('[ChatUI] Required DOM elements not found');
            return false;
        }

        this.setupInputHandler();
        this.setupQuickActions();
        return true;
    }

    /**
     * Setup input event handler
     */
    setupInputHandler() {
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.input.value.trim()) {
                const message = this.input.value.trim();
                this.input.value = '';
                // Return the message for external handling
                if (this.onMessageSend) {
                    this.onMessageSend(message);
                }
            }
        });
    }

    /**
     * Setup quick action buttons
     */
    setupQuickActions() {
        const actionsContainer = document.getElementById('quick-actions');
        if (!actionsContainer) return;

        const actions = [
            { label: "✨ Mejorar Header", query: "Mejora mi banner de bienvenida" },
            { label: "📊 Mis Stats", query: "Pon mis estadísticas de GitHub" },
            { label: "🤖 Auditoría", query: "Audita mi perfil y dime qué mejorar" },
            { label: "🏆 Logros", query: "Muestra mis trofeos" }
        ];

        actionsContainer.innerHTML = actions.map(act =>
            `<button class="action-chip" data-query="${act.query}">${act.label}</button>`
        ).join('');

        actionsContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.action-chip');
            if (chip && this.onQuickAction) {
                this.onQuickAction(chip.dataset.query);
            }
        });
    }

    /**
     * Add a message to the chat
     */
    addMessage(text, type) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}`;

        if (text === '...') {
            bubble.classList.add('loading');
            bubble.innerText = '🤖 Pensando...';
            bubble.id = this.loadingBubbleId;
        } else {
            bubble.innerText = text;
        }

        this.container.appendChild(bubble);
        this.scrollToBottom();

        // Debug logging for user messages
        if (type === 'user' && window.DebugLogger) {
            window.DebugLogger.logChat('user', text);
        }
    }

    /**
     * Add loading message
     */
    addLoadingMessage() {
        this.addMessage('...', 'ai');
    }

    /**
     * Remove loading message
     */
    removeLoading() {
        const loading = document.getElementById(this.loadingBubbleId);
        if (loading) {
            loading.remove();
        }
    }

    /**
     * Scroll to bottom of chat
     */
    scrollToBottom() {
        if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }

    /**
     * Update the discrete progress bar
     */
    updateProgress(percent, text) {
        const panel = document.getElementById('ai-progress-panel');
        const bar = document.getElementById('progress-bar-fill');
        const label = document.getElementById('progress-text');
        const percentLabel = document.getElementById('progress-percent');

        if (panel && panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
        }

        if (bar) bar.style.width = `${percent}%`;
        if (label) label.innerText = text;
        if (percentLabel) percentLabel.innerText = `${percent}%`;
    }

    /**
     * Hide the progress bar
     */
    hideProgress() {
        const panel = document.getElementById('ai-progress-panel');
        if (panel) {
            setTimeout(() => {
                panel.classList.add('hidden');
            }, 1000); // Small delay to show 100%
        }
    }

    /**
     * Set message send callback
     */
    setMessageSendCallback(callback) {
        this.onMessageSend = callback;
    }

    /**
     * Set quick action callback
     */
    setQuickActionCallback(callback) {
        this.onQuickAction = callback;
    }

    /**
     * Get container element
     */
    getContainer() {
        return this.container;
    }

    /**
     * Get input element
     */
    getInput() {
        return this.input;
    }
}

// Export singleton instance
export const chatUI = new ChatUI();
