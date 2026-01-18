import { AIService } from '../../aiService.js';
import { Logger } from '../../../utils/logger.js';

export class StackMapper {
    async map(username, insights) {
        const prompt = `YOU ARE THE PERFORMANCE DATA MINER. Map the TECHNICAL STACK of ${username}:
        
        STRICT PROTOCOL:
        1. <thinking>: Search for deep tech usage vs mere library calls. Identify manual optimizations or real automation.
        2. REPORT: Maintain a neutral, forensic tone.

        STRICT OUTPUT FORMAT (JSON):
        {
            "analysis": "Markdown report.",
            "technologies": ["Tech1", "Tech2"],
            "languages": ["Lang1", "Lang2"],
            "evidence_uids": ["uid1", "uid2"]
        }
        
        RULE: Distinguish between "using" and "implementing". Cite evidence.`;

        try {
            Logger.mapper('Analyzing Tech Stack (CPU)...');
            const schema = {
                type: "object",
                properties: {
                    analysis: { type: "string" },
                    technologies: { type: "array", items: { type: "string" } },
                    languages: { type: "array", items: { type: "string" } },
                    evidence_uids: { type: "array", items: { type: "string" } }
                },
                required: ["analysis", "technologies", "languages", "evidence_uids"]
            };

            // Use CPU endpoint for parallel execution without blocking GPU workers
            const response = await AIService.callAI_CPU('Mapper: Stack', `${prompt}\n\nINSIGHTS:\n${insights}`, 0.1, 'json_object', schema);

            if (response.error || typeof response === 'string') return { analysis: response.error || response, technologies: [], languages: [], evidence_uids: [] };
            return response;
        } catch (e) {
            return { analysis: `Stack Analysis Error: ${e.message}`, technologies: [], languages: [], evidence_uids: [] };
        }
    }
}
