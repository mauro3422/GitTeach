import { ProfileAnalyzer } from '../services/profileAnalyzer.js';
import { ChatComponent } from '../components/chatComponent.js';
import { DebugLogger } from '../utils/debugLogger.js';

/**
 * AgentManager - Orchestrates AI analysis lifecycle and chat feedback
 */
export class AgentManager {
    static async start(username) {
        if (!username || username === 'User') return;

        const analyzer = new ProfileAnalyzer();
        const { AIService } = await import('../services/aiService.js');

        // 1. Proactive greeting
        const greetingEvent = "SYSTEM_EVENT: INITIAL_GREETING";
        DebugLogger.logChat('system', greetingEvent);

        AIService.processIntent(greetingEvent, username).then(response => {
            ChatComponent.addMessage(response.message, 'ai');
            DebugLogger.logChat('ai', response.message);
        });

        // 2. Execute analysis
        analyzer.analyze(username, (data) => {
            if (typeof data === 'object' && data.type === 'Progreso') {
                ChatComponent.updateProgress(data.percent, data.message);
            } else if (data && data.type === 'DeepMemoryReady') {
                setTimeout(() => {
                    const sysEvent = "SYSTEM_EVENT: DEEP_MEMORY_READY_ACKNOWLEDGE";
                    DebugLogger.logChat('system', sysEvent);

                    AIService.processIntent(sysEvent, username).then(response => {
                        ChatComponent.addMessage(response.message, 'ai');
                        DebugLogger.logChat('ai', response.message);
                    });
                }, 1000);
            } else if (data && data.message) {
                if (data.type === 'Inventario inicializado' || data.type === 'Error') {
                    ChatComponent.updateProgress(null, `${data.type}: ${data.message}`);
                }
            }
        }).then(results => {
            ChatComponent.hideProgress();
            if (results && results.failedFiles > 0) {
                console.warn('[AgentManager] Analysis finished with failed files:', results.failedFiles);
            }
        });
    }
}
