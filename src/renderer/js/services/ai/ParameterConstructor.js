import { PromptBuilder } from '../promptBuilder.js';
import { Logger } from '../../utils/logger.js';

/**
 * ParameterConstructor - Extracts structured parameters from natural language for tools.
 */
export class ParameterConstructor {
    static async construct(input, tool, callAI) {
        const constructorPrompt = PromptBuilder.getConstructorPrompt(tool);
        const jsonResponse = await callAI(constructorPrompt, input, 0.0, 'json_object');

        try {
            let cleanJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            let parsed;
            try {
                parsed = JSON.parse(cleanJson);
            } catch {
                const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("No JSON found");
                }
            }
            const params = parsed.params || parsed || {};
            Logger.ai('CONSTRUCTOR', `TOOL: ${tool.name} | PARAMS: ${JSON.stringify(params)}`);
            return params;
        } catch (e) {
            console.error("[ParameterConstructor] Parse Error", e);
            return {};
        }
    }
}
