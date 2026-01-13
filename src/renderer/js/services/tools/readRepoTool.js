import { BaseTool } from './baseTool.js';

export class ReadRepoTool extends BaseTool {
    constructor() {
        super(
            'read_repo',
            'Leer Repositorio (README)',
            'Lee el contenido del README.md de un repositorio específico para analizarlo.',
            ["Lee el repo de giteach", "Analiza mi proyecto intro-electron", "Qué hace el repo test?"],
            {
                repo: 'Name of the repository to read',
                owner: 'Owner username (optional, defaults to current user)'
            }
        );
    }

    async execute(params, username) {
        const repoName = params.repo;
        const owner = params.owner || username;

        if (!repoName) return { success: false, details: "Falta el parámetro 'repo'." };

        try {
            const file = await window.githubAPI.getFileContent(owner, repoName, 'README.md');
            if (file.error) return { success: false, details: `No pude leer el README de ${owner}/${repoName}. Error: ${file.error}` };

            const content = atob(file.content.replace(/\n/g, ''));
            const truncated = content.substring(0, 2000) + (content.length > 2000 ? "\n... (truncado)" : "");

            return {
                success: true,
                details: `Contenido de ${repoName}/README.md:\n${truncated}`
            };
        } catch (e) {
            return { success: false, details: `Error leyendo repo: ${e.message}` };
        }
    }
}
