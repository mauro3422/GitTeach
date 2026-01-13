import { BaseTool } from './baseTool.js';

export class ActivityGraphTool extends BaseTool {
    constructor() {
        super(
            'activity_graph',
            'GitHub Activity Graph',
            'Muestra un gráfico detallado de la actividad de contribuciones reciente.',
            ["Pon mi gráfico de actividad", "Muestra mi progreso anual", "Gráfico de contribuciones"],
            { theme: 'Theme name (github, react, tokyonight, etc.)' }
        );
    }

    async execute(params, username) {
        const theme = params.theme || 'tokyonight';
        const markdown = `![Activity Graph](https://github-readme-activity-graph.vercel.app/graph?username=${username}&theme=${theme})`;

        return {
            success: true,
            content: markdown,
            details: `Gráfico de actividad (${theme}) generado.`
        };
    }
}
