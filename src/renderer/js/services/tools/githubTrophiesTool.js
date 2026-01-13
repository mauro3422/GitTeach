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
        const markdown = `[![Trophies](https://github-profile-trophy.vercel.app/?username=${username}&theme=${theme}&no-frame=true&no-bg=true&margin-w=4&t=${Date.now()})](https://github.com/ryo-ma/github-profile-trophy)`;

        return { success: true, content: markdown, details: "Trofeos insertados." };
    }
}
