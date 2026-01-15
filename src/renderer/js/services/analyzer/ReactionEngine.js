import { AIService } from '../aiService.js';
import { DebugLogger } from '../../utils/debugLogger.js';

/**
 * ReactionEngine - Handles autonomous AI reactions to system events.
 */
export class ReactionEngine {
    static async trigger(username, eventDescription, type = 'system') {
        if (!username) return;

        const reactivePrompt = type === 'system'
            ? `SYSTEM_EVENT: ${eventDescription}`
            : eventDescription;

        setTimeout(async () => {
            try {
                DebugLogger.logChat('system', reactivePrompt);
                const response = await AIService.processIntent(reactivePrompt, username);

                // Try to update UI
                try {
                    const { ChatComponent } = await import('../../components/chatComponent.js');
                    if (ChatComponent) ChatComponent.addMessage(response.message, 'ai');
                } catch (uiError) {
                    // Headless or UI not ready
                }

                DebugLogger.logChat('ai', response.message);
            } catch (err) {
                console.error("[ReactionEngine] Autonomous error:", err);
            }
        }, 800);
    }
}
