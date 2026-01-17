/**
 * QueryTechnicalMetricsTool - Allows AI to retrieve mathematical health layers.
 */
import { BaseTool } from './baseTool.js';
import { LayeredPersistenceManager } from '../curator/LayeredPersistenceManager.js';

export class QueryTechnicalMetricsTool extends BaseTool {
    constructor() {
        super(
            'query_technical_metrics',
            'Query Technical Metrics',
            'Retrieves deterministic health metrics (logic, resilience, semantic) for a user profile.',
            ['Check the logic health of the profile', 'Get the resilience metrics for this user'],
            {
                subType: {
                    type: 'string',
                    enum: ['health', 'logic', 'resilience', 'semantic'],
                    description: 'The specific metric layer to retrieve.'
                }
            }
        );
    }

    async execute(params, username) {
        let { subType = 'health' } = params;

        // Logical Routing: All deep metrics are currently inside the 'health' layer report
        const storageLayer = 'health';

        try {
            const data = await LayeredPersistenceManager.getLayer(username, 'metrics', storageLayer);

            if (!data) {
                return {
                    success: false,
                    details: `No technical metrics found for layer '${subType}'. The system might still be analyzing.`
                };
            }

            return {
                success: true,
                details: `### TECHNICAL METRICS: ${subType.toUpperCase()}\n\n${JSON.stringify(data, null, 2)}`
            };
        } catch (e) {
            return { success: false, details: `Error querying metrics: ${e.message}` };
        }
    }
}
