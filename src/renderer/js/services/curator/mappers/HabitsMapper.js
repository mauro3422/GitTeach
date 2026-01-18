import { AIService } from '../../aiService.js';
import { Logger } from '../../../utils/logger.js';

export class HabitsMapper {
    async map(username, insights, healthReport) {
        const prompt = `YOU ARE THE SENIOR CODE QUALITY AUDITOR. Analyze the files and extract ${username}'s CODING HABITS:
        
        STRICT PROTOCOL:
        1. <thinking>: Critique language integrity, robustness (error handling), and evolution from scripter to architect.
        2. REPORT: Be honest and critical. Cite evidence for every claim.
        
        RULE: Avoid generic praise. If you see "INTEGRITY ANOMALY", be severe.
        
        ### GLOBAL HEALTH AUDIT (Mathematical Truth):
        - SOLID Average: ${healthReport?.averages?.solid || 'N/A'}/5
        - SIGNIFICANCE: ${healthReport?.volume?.status || 'UNKNOWN'}`;

        try {
            Logger.mapper('Analyzing Coding Habits (CPU)...');
            const schema = {
                type: "object",
                properties: {
                    analysis: { type: "string" },
                    evidence_uids: { type: "array", items: { type: "string" } }
                },
                required: ["analysis", "evidence_uids"]
            };

            // Use CPU endpoint for parallel execution without blocking GPU workers
            const response = await AIService.callAI_CPU('Mapper: Habits', `${prompt}\n\nINSIGHTS:\n${insights}`, 0.1, 'json_object', schema);

            if (response.error || typeof response === 'string') return { analysis: response.error || response, evidence_uids: [] };
            return response;
        } catch (e) {
            return { analysis: `Habits Analysis Error: ${e.message}`, evidence_uids: [] };
        }
    }
}
