import { BaseTool } from './baseTool.js';

export class ListReposTool extends BaseTool {
    constructor() {
        super(
            'list_repos',
            'Listar Repositorios',
            'Obtiene una lista de los repositorios públicos del usuario.',
            ["Qué repos tengo?", "Lista mis proyectos", "Analiza mis repositorios"],
            {}
        );
    }

    async execute(params, username) {
        try {
            const repos = await window.githubAPI.listRepos();
            if (!repos || repos.length === 0) {
                return { success: true, details: "El usuario no tiene repositorios públicos." };
            }

            const summary = repos.map(r => `- ${r.name} (⭐ ${r.stargazers_count}): ${r.description || 'Sin descripción'}`).join('\n');
            return {
                success: true,
                details: `Lista de Repositorios:\n${summary}`
            };
        } catch (e) {
            return { success: false, details: `Error listando repos: ${e.message}` };
        }
    }
}
