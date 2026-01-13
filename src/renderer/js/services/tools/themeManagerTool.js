import { BaseTool } from './baseTool.js';

export class ThemeManagerTool extends BaseTool {
    constructor() {
        super(
            'theme_manager',
            'Global Theme Manager',
            'Cambia el tema visual de todos los widgets del README de forma coherente.',
            ["Pon todo en tema oscuro", "Tema Drácula para mis stats", "Cambia el tema a tokyonight"],
            {
                theme: 'Nombre del tema (dark, radical, merko, gruvbox, tokyonight, dracula, etc.)'
            }
        );
    }

    async execute(params, username) {
        const theme = params.theme || 'dark';

        // Esta es una herramienta agéntica de "Edición Mágica". 
        // En lugar de añadir contenido, propone una transformación.
        // Como BaseTool espera 'content' para añadir, aquí generamos un bloque de comentario
        // o actualizamos los existentes si fuera un editor más avanzado.

        // Por ahora, generaremos un bloque de ejemplo de cómo se vería una sección con ese tema.
        const content = `> 🎨 **Theme Preview (${theme})**: He preparado una configuración visual coherente para tus widgets. \n\n` +
            `![Stats](https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&theme=${theme})\n` +
            `![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=${theme})`;

        return {
            success: true,
            content: content,
            details: `Aplicando previsualización del tema '${theme}'.`
        };
    }
}
