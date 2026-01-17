/**
 * QueryThematicAnalysisTool - Allows AI to retrieve deep thematic AI analysis layers.
 */
import { BaseTool } from './baseTool.js';
import { LayeredPersistenceManager } from '../curator/LayeredPersistenceManager.js';

export class QueryThematicAnalysisTool extends BaseTool {
    constructor() {
        super(
            'query_thematic_analysis',
            'Query Thematic Analysis',
            'Retrieves deep AI-generated thematic reports (architecture, habits, stack) for a user profile.',
            ['What are the coding habits of this user?', 'Analyze their architectural patterns'],
            {
                subType: {
                    type: 'string',
                    enum: ['architecture', 'habits', 'stack'],
                    description: 'The thematic layer to retrieve.'
                }
            }
        );
    }

    async execute(params, username) {
        let { subType } = params;

        // Alias mapping to handle common AI hallucinations
        if (subType === 'programming_habits') subType = 'habits';
        if (subType === 'tech_stack' || subType === 'technology') subType = 'stack';

        if (!subType) {
            return { success: false, details: 'Please specify a thematic layer (architecture, habits, or stack).' };
        }

        try {
            const data = await LayeredPersistenceManager.getLayer(username, 'theme', subType);

            if (!data) {
                return {
                    success: false,
                    details: `No thematic analysis found for '${subType}'. This layer might be pending hydration.`
                };
            }

            return {
                success: true,
                details: `### THEMATIC ANALYSIS: ${subType.toUpperCase()}\n\n${data}`
            };
        } catch (e) {
            return { success: false, details: `Error querying thematic analysis: ${e.message}` };
        }
    }
}
