import { AIService } from '../../aiService.js';
import { Logger } from '../../../utils/logger.js';

export class ArchitectureMapper {
    async map(username, insights, healthReport) {
        // Updated Protocol for Traceability
        const prompt = `YOU ARE THE CRITICAL SYSTEM AUDITOR. Identify the REAL ARCHITECTURAL MATURITY of ${username}.

        INPUT DATA contains [UID:...] tags. You MUST preserve these UIDs when citing evidence.

        STRICT OUTPUT FORMAT (JSON):
        {
            "analysis": "Markdown report. Cite specific files and patterns. When you mention a finding, you can (optionally) verify if it aligns with the UIDs provided, but focus on the narrative.",
            "evidence_uids": ["uid1", "uid2"] // Array of strings. Extract the [UID:...] from the most critical insights used in your analysis.
        }

        ### GLOBAL HEALTH AUDIT (Mathematical Truth):
        - SOLID Average: ${healthReport?.averages?.solid || 'N/A'}/5
        - Modularity: ${healthReport?.averages?.modularity || 'N/A'}/5`;

        try {
            Logger.mapper('Analyzing Architecture (CPU)...');
            // Request JSON Mode
            const schema = {
                type: "object",
                properties: {
                    analysis: { type: "string" },
                    evidence_uids: { type: "array", items: { type: "string" } }
                },
                required: ["analysis", "evidence_uids"]
            };

            // Use CPU endpoint for parallel execution without blocking GPU workers
            const response = await AIService.callAI_CPU('Mapper: Architecture', `${prompt}\n\nINSIGHTS:\n${insights}`, 0.1, 'json_object', schema);

            // Fallback if AI returns plain text error or fails schema
            if (response.error || typeof response === 'string') return { analysis: response.error || response, evidence_uids: [] };

            return response;

        } catch (e) {
            return { analysis: `Architecture Analysis Error: ${e.message}`, evidence_uids: [] };
        }
    }
}
