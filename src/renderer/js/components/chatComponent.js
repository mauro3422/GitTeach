// src/renderer/js/components/chatComponent.js
export const ChatComponent = {
    container: null,
    input: null,
    isProcessing: false,

    init() {
        this.container = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input-box');

        if (!this.container || !this.input) {
            console.error('[ChatComponent] Required DOM elements not found');
            return;
        }

        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.input.value.trim() && !this.isProcessing) {
                this.sendMessage(this.input.value.trim());
                this.input.value = '';
            }
        });

        this.initQuickActions();
    },

    initQuickActions() {
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
            if (chip && !this.isProcessing) {
                this.sendMessage(chip.dataset.query);
            }
        });
    },

    sendMessage(text) {
        console.log("[ChatComponent] Sending message:", text);
        if (window.githubAPI?.logToTerminal) window.githubAPI.logToTerminal(`💬 Chat Input: ${text}`);

        this.addMessage(text, 'user');
        this.processAIResponse(text);
    },

    addMessage(text, type) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}`;

        if (text === '...') {
            bubble.classList.add('loading');
            bubble.innerText = '🤖 Pensando...';
            bubble.id = 'ai-loading-bubble';
        } else {
            bubble.innerText = text;
        }

        this.container.appendChild(bubble);
        this.scrollToBottom();
    },

    removeLoading() {
        const loading = document.getElementById('ai-loading-bubble');
        if (loading) loading.remove();
    },

    async processAIResponse(userInput) {
        this.isProcessing = true;
        this.addMessage('...', 'ai');

        try {
            const { AIService } = await import('../services/aiService.js');
            const { ToolRegistry } = await import('../services/toolRegistry.js');
            const { AIToolbox } = await import('../services/aiToolbox.js');
            const { DashboardView } = await import('../views/dashboard.js');

            const usernameEl = document.getElementById('user-name');
            const username = usernameEl?.dataset.login || DashboardView.currentUsername || 'User';
            const intent = await AIService.processIntent(userInput, username);

            this.removeLoading();

            // La "Acción" ya se ejecutó dentro del servicio (Ciclo Cerrado).
            // Solo mostramos el mensaje final del AI Report.
            console.log("[ChatComponent] Respuesta AI recibida:", intent.message);
            this.addMessage(intent.message, 'ai');
        } catch (error) {
            console.error("[ChatComponent] Error procesando AI:", error);
            if (window.githubAPI?.logToTerminal) window.githubAPI.logToTerminal(`❌ Chat Error: ${error.message}`);

            this.removeLoading();
            this.addMessage("Ups, perdí la conexión con mi motor local. ¿Está el servidor encendido?", 'ai');
            console.error('ChatComponent Error:', error);
        } finally {
            this.isProcessing = false;
        }
    },

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    },

    /**
     * Shows an agentic process step (e.g. "Analyzing repo X")
     */
    showProactiveStep(message) {
        if (!this.container) return;
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ai proactive';
        bubble.style.borderLeft = '3px solid var(--accent)';
        bubble.style.boxShadow = 'var(--border-glow)';
        bubble.innerHTML = `<span class="bot-icon">🧵</span> ${message}`;
        this.container.appendChild(bubble);
        this.scrollToBottom();
    },

    /**
     * Muestra un insight proactivo de la IA
     */
    /**
     * Muestra un insight proactivo de la IA
     */
    showInsight(message) {
        if (!this.container) return;
        this.addMessage(message, 'ai');
        if (window.githubAPI?.logToTerminal) window.githubAPI.logToTerminal(`🤖 AI Insight Automatic: ${message}`);
    },

    /**
     * Updates the discrete progress bar
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
    },

    /**
     * Hides the progress bar
     */
    hideProgress() {
        const panel = document.getElementById('ai-progress-panel');
        if (panel) {
            setTimeout(() => {
                panel.classList.add('hidden');
            }, 1000); // Small delay to show 100%
        }
    }
};
