/**
 * MessageHandler.js
 * Responsabilidad: Procesamiento y formateo de mensajes para AI
 */

export const MessageHandler = {
    /**
     * Format messages for AI API
     */
    formatMessages(systemPrompt, userMessage, conversationHistory = []) {
        const messages = [];

        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        // Add conversation history
        conversationHistory.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // Add current user message
        if (userMessage) {
            messages.push({
                role: 'user',
                content: userMessage
            });
        }

        return messages;
    },

    /**
     * Parse AI response into readable format
     */
    parseResponse(response) {
        if (!response || !response.message) {
            throw new Error('Invalid AI response format');
        }

        return {
            content: response.message.content,
            role: response.message.role,
            model: response.model,
            done: response.done,
            totalDuration: response.total_duration,
            loadDuration: response.load_duration,
            promptEvalCount: response.prompt_eval_count,
            promptEvalDuration: response.prompt_eval_duration,
            evalCount: response.eval_count,
            evalDuration: response.eval_duration
        };
    },

    /**
     * Extract text content from streaming chunks
     */
    extractStreamingContent(chunk) {
        if (!chunk || !chunk.message) return '';

        return chunk.message.content || '';
    },

    /**
     * Check if streaming response is complete
     */
    isStreamComplete(chunk) {
        return chunk && chunk.done === true;
    },

    /**
     * Build system prompt for specific use cases
     */
    buildSystemPrompt(context, task) {
        const basePrompt = `You are an expert software engineer and technical assistant.`;

        const contextPrompts = {
            'code-review': `You are reviewing code for best practices, security issues, performance optimizations, and maintainability.`,
            'debugging': `You are helping debug an issue. Focus on identifying root causes and providing clear solutions.`,
            'architecture': `You are advising on software architecture and design patterns.`,
            'documentation': `You are helping write clear, comprehensive documentation.`,
            'refactoring': `You are suggesting code refactoring improvements following SOLID principles and best practices.`
        };

        const contextPrompt = contextPrompts[context] || '';

        return `${basePrompt} ${contextPrompt}\n\nTask: ${task}`;
    },

    /**
     * Format code blocks in messages
     */
    formatCodeBlocks(content) {
        // Convert markdown code blocks to readable format
        return content
            .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                return `\n[${lang || 'code'}]\n${code}\n[/${lang || 'code'}]\n`;
            })
            .replace(/`([^`]+)`/g, (match, code) => {
                return `"${code}"`;
            });
    },

    /**
     * Truncate conversation history to fit context limits
     */
    truncateHistory(history, maxTokens = 4000) {
        // Simple truncation by message count (can be improved with token counting)
        const maxMessages = 10;
        if (history.length <= maxMessages) {
            return history;
        }

        // Keep system message and recent messages
        const systemMessage = history.find(msg => msg.role === 'system');
        const recentMessages = history.slice(-maxMessages + (systemMessage ? 1 : 0));

        return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
    },

    /**
     * Validate message format
     */
    validateMessage(message) {
        if (!message || typeof message !== 'object') {
            throw new Error('Message must be an object');
        }

        if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
            throw new Error('Message must have a valid role: system, user, or assistant');
        }

        if (!message.content || typeof message.content !== 'string') {
            throw new Error('Message must have string content');
        }

        return true;
    },

    /**
     * Create a user message
     */
    createUserMessage(content) {
        return {
            role: 'user',
            content: content
        };
    },

    /**
     * Create an assistant message
     */
    createAssistantMessage(content) {
        return {
            role: 'assistant',
            content: content
        };
    },

    /**
     * Create a system message
     */
    createSystemMessage(content) {
        return {
            role: 'system',
            content: content
        };
    }
};
