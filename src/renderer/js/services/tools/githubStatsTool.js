import { BaseTool } from './baseTool.js';

export class GithubStatsTool extends BaseTool {
    constructor() {
        super(
            'github_stats',
            'GitHub Stats Banner',
            'Muestra estadísticas generales, puntuación de commits y niveles del perfil.',
            ["Pon mis estadísticas de github", "Quiero ver mis stats", "Insertar tabla de rendimiento"],
            { theme: 'Aesthetic theme (tokyonight, dracula, radical, etc.)' }
        );
    }

    async execute(params, username) {
        const theme = params.theme || 'tokyonight';
        const markdown = `![GitHub Stats](http://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=${username}&theme=${theme}&t=${Date.now()})`;

        return {
            success: true,
            content: markdown, // Devolvemos el contenido generado
            details: `Banner de estadísticas (${theme}) generado correctamente.`
        };
    }
}
