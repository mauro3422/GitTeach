import { BaseTool } from './baseTool.js';

export class ReadFileTool extends BaseTool {
    constructor() {
        super(
            'read_file',
            'Leer Código de Archivo',
            'Lee el código fuente de cualquier archivo (py, js, cpp, json, etc). Úsala si el usuario pide ver el contenido de un archivo específico o si menciona una extensión.',
            ["Dime qué hay en src/main.js", "Lee el archivo manage_state.py", "Ver código de Atom.cpp"],
            {
                repo: 'Name of the repository',
                path: 'Full path to the file (e.g., src/main.js)',
                owner: 'Owner username (optional)'
            }
        );
    }

    async execute(params, username) {
        const repoName = params.repo;
        const filePath = params.path;
        const owner = params.owner || username;

        if (!repoName || !filePath) return { success: false, details: "Faltan parámetros 'repo' o 'path'." };

        try {
            const file = await window.githubAPI.getFileContent(owner, repoName, filePath);
            if (file.error) return { success: false, details: `No pude leer el archivo ${filePath}. Error: ${file.error}` };

            const content = atob(file.content.replace(/\n/g, ''));
            const truncated = content.substring(0, 3000) + (content.length > 3000 ? "\n... (truncado para optimizar contexto)" : "");

            return {
                success: true,
                details: `Contenido de ${repoName}/${filePath}:\n\n\`\`\`\n${truncated}\n\`\`\``
            };
        } catch (e) {
            return { success: false, details: `Error leyendo archivo: ${e.message}` };
        }
    }
}
