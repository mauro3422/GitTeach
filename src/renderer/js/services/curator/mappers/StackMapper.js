import { AIService } from '../../aiService.js';
import { AISlotPriorities } from '../../ai/AISlotManager.js';
import { Logger } from '../../../utils/logger.js';

export class StackMapper {
    async map(username, insights) {
        const prompt = `YOU ARE THE PERFORMANCE DATA MINER. Map the TECHNICAL STACK of ${username}:
        
        STRICT PROTOCOL:
        1. <thinking>: Search for deep tech usage vs mere library calls. Identify manual optimizations or real automation.
        2. REPORT: Maintain a neutral, forensic tone.
        
        RULE: Distinguish between "using" and "implementing". Cite evidence.`;

        try {
            Logger.mapper('Analyzing Tech Stack...');
            return await AIService.callAI('Mapper: Stack', `${prompt}\n\nINSIGHTS:\n${insights}`, 0.1, null, null, AISlotPriorities.BACKGROUND);
        } catch (e) {
            return `Stack Analysis Error: ${e.message}`;
        }
    }
}
