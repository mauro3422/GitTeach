// src/renderer/js/components/chatComponent.js
export const ChatComponent = {
    container: null,
    input: null,
    isProcessing: false,

    init() {
        this.container = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input-box');

        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.input.value.trim() && !this.isProcessing) {
                const text = this.input.value.trim();
                this.addMessage(text, 'user');
                this.input.value = '';
                this.processAIResponse(text);
            }
        });
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

            const username = DashboardView.currentUsername || 'User';
            const intent = await AIService.processIntent(userInput, username);

            this.removeLoading();

            // La "Acción" ya se ejecutó dentro del servicio (Ciclo Cerrado).
            // Solo mostramos el mensaje final del AI Report.
            this.addMessage(intent.message, 'ai');
        } catch (error) {
            this.removeLoading();
            this.addMessage("Ups, perdí la conexión con mi motor local. ¿Está el servidor encendido?", 'ai');
            console.error('ChatComponent Error:', error);
        } finally {
            this.isProcessing = false;
        }
    },

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }
};
