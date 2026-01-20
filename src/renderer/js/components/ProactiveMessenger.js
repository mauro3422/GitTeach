/**
 * ProactiveMessenger.js
 * Isolated logic for proactive insights and agentic step notifications
 * Extracted from ChatComponent.js to comply with SRP
 */

export class ProactiveMessenger {
    constructor(chatUI) {
        this.chatUI = chatUI;
    }

    /**
     * Shows an agentic process step (e.g. "Analyzing repo X")
     */
    showProactiveStep(message) {
        if (!this.chatUI.getContainer()) return;

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ai proactive';
        bubble.style.borderLeft = '3px solid var(--accent)';
        bubble.style.boxShadow = 'var(--border-glow)';
        bubble.innerHTML = `<span class="bot-icon">🧵</span> ${message}`;

        this.chatUI.getContainer().appendChild(bubble);
        this.chatUI.scrollToBottom();
    }

    /**
     * Shows a proactive insight from the AI
     */
    showInsight(message) {
        if (!this.chatUI.getContainer()) return;

        this.chatUI.addMessage(message, 'ai');

        if (window.githubAPI?.logToTerminal) {
            window.githubAPI.logToTerminal(`🤖 AI Insight Automatic: ${message}`);
        }
    }

    /**
     * Show repository scanning progress
     */
    showScanningProgress(repoName, current, total) {
        const message = `🔍 Scanning ${repoName} (${current}/${total})`;
        this.showProactiveStep(message);
    }

    /**
     * Show analysis completion
     */
    showAnalysisComplete(repoName, filesCount) {
        const message = `✅ Completed analysis of ${repoName} (${filesCount} files processed)`;
        this.showProactiveStep(message);
    }

    /**
     * Show AI processing status
     */
    showAIProcessing(status) {
        const statusMessages = {
            'starting': '🧠 AI is analyzing your code...',
            'processing': '⚡ Processing insights...',
            'generating': '✨ Generating recommendations...',
            'complete': '🎯 Analysis complete!'
        };

        const message = statusMessages[status] || status;
        this.showProactiveStep(message);
    }

    /**
     * Show error notifications
     */
    showError(errorType, details) {
        const errorMessages = {
            'network': '🌐 Connection issue detected',
            'timeout': '⏱️ Request timed out',
            'server': '🖥️ Server error occurred',
            'auth': '🔐 Authentication required'
        };

        const baseMessage = errorMessages[errorType] || '❌ An error occurred';
        const fullMessage = details ? `${baseMessage}: ${details}` : baseMessage;

        this.showProactiveStep(fullMessage);
    }

    /**
     * Show success notifications
     */
    showSuccess(message) {
        const successMessage = `✅ ${message}`;
        this.showProactiveStep(successMessage);
    }

    /**
     * Show warning notifications
     */
    showWarning(message) {
        const warningMessage = `⚠️ ${message}`;
        this.showProactiveStep(warningMessage);
    }

    /**
     * Show informational messages
     */
    showInfo(message) {
        const infoMessage = `ℹ️ ${message}`;
        this.showProactiveStep(infoMessage);
    }

    /**
     * Show memory consolidation progress
     */
    showMemoryUpdate(memoryType, count) {
        const messages = {
            'insights': `🧠 Consolidated ${count} code insights`,
            'patterns': `🔄 Identified ${count} coding patterns`,
            'recommendations': `💡 Generated ${count} recommendations`
        };

        const message = messages[memoryType] || `💾 Updated ${memoryType} (${count})`;
        this.showProactiveStep(message);
    }

    /**
     * Show pipeline status updates
     */
    showPipelineStatus(stage, progress) {
        const messages = {
            'scanning': `🔍 Scanning repositories... ${progress}%`,
            'analyzing': `⚡ Analyzing code... ${progress}%`,
            'processing': `🧠 Processing insights... ${progress}%`,
            'complete': `🎉 Pipeline complete!`
        };

        const message = messages[stage] || `${stage}: ${progress}%`;
        this.showProactiveStep(message);
    }
}

// Export singleton instance - will be initialized with chatUI
export const proactiveMessenger = new ProactiveMessenger();
