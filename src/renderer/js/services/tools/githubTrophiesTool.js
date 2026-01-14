import { BaseTool } from './baseTool.js';

export class GitHubTrophiesTool extends BaseTool {
    constructor() {
        super(
            'github_trophies',
            'GitHub Trophies',
            'Muestra trofeos visuales basados en logros (estrellas, commits, seguidores).',
            ["Pon mis trofeos", "Muestra mis logros", "Quiero ver mis medallas"],
            { theme: 'Theme name (flat, onedark, gitlab, etc.)' }
        );
    }

    async execute(params, username) {
        const theme = params.theme || 'flat';
        const url = `https://github-profile-trophy-kappa.vercel.app/?username=${username}&theme=${theme}&no-frame=true&no-bg=true&margin-w=4&t=${Date.now()}`;

        // Verificar disponibilidad
        const isUp = await this.isWidgetAvailable(url);

        let markdown;
        if (isUp) {
            markdown = `[![Trophies](${url})](https://github.com/ryo-ma/github-profile-trophy)`;
        } else {
            markdown = `![Trophies Unavailable](https://img.shields.io/badge/Trophies-Service_Unavailable-red?style=flat-square&logo=github)`;
        }

        return {
            success: true,
            content: markdown,
            details: isUp ? "Trofeos insertados." : "Servicio de Trofeos no disponible (fallback activado)."
        };
    }
}
