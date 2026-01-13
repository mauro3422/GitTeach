import { BaseTool } from './baseTool.js';

export class ProjectShowcaseTool extends BaseTool {
    constructor() {
        super(
            'project_showcase',
            'Project Showcase Card',
            'Crea una tarjeta visual destacada para uno de tus repositorios.',
            ["Destaca mi proyecto Giteach", "Haz una tarjeta de mi repo LifeSimulator", "Muestra mi mejor proyecto"],
            {
                repo: 'Nombre del repositorio',
                theme: 'Tema visual (dark, shadow, flat)'
            }
        );
    }

    async execute(params, username) {
        if (!params.repo) {
            return { success: false, details: "Debes especificar qué repositorio quieres destacar." };
        }

        // Buscamos datos del repo para que la tarjeta sea real
        try {
            const repos = await window.githubAPI.listRepos();
            const repoData = repos.find(r => r.name.toLowerCase() === params.repo.toLowerCase());

            const description = repoData?.description || "Un proyecto increíble desarrollado con pasión.";
            const language = repoData?.language || "Multi-language";
            const stars = repoData?.stargazers_count || 0;

            const content = `\n## 🚀 Featured Project: [${params.repo}](https://github.com/${username}/${params.repo})\n\n` +
                `> ${description}\n\n` +
                `| 🛠 Language | ⭐ Stars | 🔗 Link |\n` +
                `| :--- | :--- | :--- |\n` +
                `| **${language}** | **${stars}** | [View Repo](https://github.com/${username}/${params.repo}) |\n` +
                `\n---\n`;

            return {
                success: true,
                content: content,
                details: `Tarjeta destacada para '${params.repo}' generada.`
            };
        } catch (e) {
            return { success: false, details: "Error al obtener datos del repo: " + e.message };
        }
    }
}
