import { BaseTool } from './baseTool.js';
import { ProfileBuilder } from '../agent/ProfileBuilder.js';
import { AIService } from '../aiService.js';

export class GenerateProfileReadmeTool extends BaseTool {
    constructor() {
        super(
            'generate_profile_readme',
            'Generate Profile README',
            'Generates a professional, personal BRANDING profile (README.md) for the user. Use this when the user says "Create my profile", "Make a readme for me", etc. NOT for project docs.'
        );
        this.schema = {
            style: "string (optional): 'minimal', 'visual', 'detailed'"
        };
    }

    async execute(params, username) {
        // We need IS_TRACER context to know if we can access the full context
        // Ideally, AIService injects the context. 
        // For now, we assume AIService has the currentSessionContext populated if running in standard flow.

        // REFACTOR: We need "Identity" (DNA). In the main app, checking CacheAPI.
        // In Tracer, checking 'Globals'. We will try to fetch from window/global.

        let identity = {};
        if (typeof window !== 'undefined' && window.cacheAPI) {
            identity = await window.cacheAPI.getTechnicalIdentity(username);
        } else if (typeof global !== 'undefined' && global.Globals && global.Globals.metabolicSnapshot) {
            // Tracer Environment
            identity = global.Globals.metabolicSnapshot.before || {};
        }

        const builder = new ProfileBuilder(AIService);
        const result = await builder.generateProfile(username, identity);

        return {
            success: true,
            details: `Profile Generated via Agentic Loop. Critique Applied: ${result.meta.critique_applied}`,
            content: result.content
        };
    }
}
