import { BaseTool } from './baseTool.js';

export class TopLangsTool extends BaseTool {
    constructor() {
        super(
            'top_langs',
            'Top Languages Card',
            'Gráfico circular de los lenguajes de programación más usados.',
            ["Gráfico de lenguajes más usados", "Top lenguajes", "Mis idiomas de programación"],
            { theme: 'Theme name' }
        );
    }

    async execute(params, username) {
        const theme = params.theme || 'tokyonight';
        const markdown = `![Top Langs](https://github-profile-summary-cards.vercel.app/api/cards/repos-per-language?username=${username}&theme=${theme}&t=${Date.now()})`;

        return {
            success: true,
            content: markdown,
            details: `Gráfico de lenguajes (${theme}) generado.`
        };
    }
}
