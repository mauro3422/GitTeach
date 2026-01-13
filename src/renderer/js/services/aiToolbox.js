/**
 * AIToolbox - Catálogo de herramientas y plantillas para la IA.
 * Permite a la IA interactuar con el contenido del README.
 */
export const AIToolbox = {
    // Plantillas de Banners "ya definidos" como pidió el usuario
    banners: {
        github_stats: (user) => `![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${user}&show_icons=true&theme=tokyonight)`,
        top_langs: (user) => `![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=${user}&layout=compact&theme=tokyonight)`,
        welcome_header: (user) => `![Welcome](https://capsule-render.vercel.app/api?type=waving&color=auto&height=200&section=header&text=Welcome%20to%20${user}%20Profile&fontSize=60)`,
        tech_stack: () => `### 🛠️ Tech Stack\n\n![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black) ![Electron](https://img.shields.io/badge/-Electron-47848F?logo=electron&logoColor=white)`,
        contribution_snake: (user) => `![Snake Game](https://github.com/${user}/${user}/blob/output/github-contribution-grid-snake.svg)`
    },

    /**
     * Inserta un elemento en el editor con soporte para parámetros dinámicos
     * @param {string} type - ID de la herramienta
     * @param {string} username - Nombre de usuario de GitHub
     * @param {Object} params - Parámetros extra (color, texto, etc)
     */
    insertBanner(type, username, params = {}) {
        const editor = document.getElementById('readme-editor');
        if (!editor) return false;

        // Helper para normalizar colores (Capsule Render prefiere HEX sin #)
        const getColor = (name) => {
            const colors = {
                'red': 'ff5555', 'rojo': 'ff5555',
                'blue': '00aeff', 'azul': '00aeff',
                'green': '2ecc71', 'verde': '2ecc71',
                'purple': '9b59b6', 'violets': '9b59b6', 'violeta': '9b59b6',
                'orange': 'f39c12', 'naranja': 'f39c12',
                'black': '000000', 'negro': '000000',
                'white': 'ffffff', 'blanco': 'ffffff'
            };
            return colors[name?.toLowerCase()] || name || 'auto';
        };

        // Mapeo dinámico basado en plantillas
        const templates = {
            github_stats: (u, p) => `![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${u}&show_icons=true&theme=${p.theme || 'tokyonight'})`,
            top_langs: (u, p) => `![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=${u}&layout=compact&theme=${p.theme || 'tokyonight'})`,
            welcome_header: (u, p) => `![Welcome](https://capsule-render.vercel.app/api?type=${p.type || 'waving'}&color=${getColor(p.color)}&height=${p.height || '200'}&section=header&text=${encodeURIComponent(p.text || 'Welcome to ' + u + ' Profile')}&fontSize=${p.fontSize || '60'})`,
            tech_stack: (u, p) => `### 🛠️ Tech Stack\n\n![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black) ![Electron](https://img.shields.io/badge/-Electron-47848F?logo=electron&logoColor=white)`,
            contribution_snake: (u, p) => `![Snake Game](https://github.com/${u}/${u}/blob/output/github-contribution-grid-snake.svg)`,
            github_trophies: (u, p) => `[![Trophies](https://github-profile-trophy.vercel.app/?username=${u}&theme=${p.theme || 'flat'}&no-frame=true&no-bg=true&margin-w=4)](https://github.com/ryo-ma/github-profile-trophy)`,
            streak_stats: (u, p) => `[![GitHub Streak](https://github-readme-streak-stats.herokuapp.com/?user=${u}&theme=${p.theme || 'default'})](https://git.io/streak-stats)`,
            profile_views: (u, p) => `![Visitor Count](https://komarev.com/ghpvc/?username=${u}&color=${p.color || 'blue'})`
        };

        if (templates[type]) {
            const bannerMarkdown = templates[type](username, params);

            // Insertar al inicio del editor
            const currentContent = editor.value;
            editor.value = bannerMarkdown + '\n\n' + currentContent;

            // Simular un evento de cambio para que el sistema reconozca la edición
            editor.dispatchEvent(new Event('input'));

            return {
                success: true,
                details: `Banner '${type}' (Color: ${params.color || 'auto'}) insertado correctamente.`
            };
        } else {
            return {
                success: false,
                details: `Error: No existe el estilo de banner '${type}'.`
            };
        }
    },

    /**
     * Reemplaza el contenido completo (Edición de IA)
     * @param {string} newContent 
     */
    applyMagicEdit(newContent) {
        const editor = document.getElementById('readme-editor');
        if (!editor) return { success: false, details: "Editor no encontrado." };

        editor.value = newContent;
        editor.dispatchEvent(new Event('input'));
        return { success: true, details: "Contenido reemplazado completamente." };
    },

    /**
     * Herramientas de Análisis (Data Retrieval)
     */
    async listRepos() {
        try {
            const repos = await window.githubAPI.listRepos();
            if (!repos || repos.length === 0) return { success: true, details: "El usuario no tiene repositorios públicos." };

            const summary = repos.map(r => `- ${r.name} (⭐ ${r.stargazers_count}): ${r.description || 'Sin descripción'}`).join('\n');
            return {
                success: true,
                details: `Lista de Repositorios:\n${summary}`
            };
        } catch (e) {
            return { success: false, details: `Error listando repos: ${e.message}` };
        }
    },

    async readRepo(currentUsername, params) {
        const repoName = params.repo;
        const owner = params.owner || currentUsername;

        if (!repoName) return { success: false, details: "Falta el parámetro 'repo'." };

        try {
            // Intentamos leer el README
            const file = await window.githubAPI.getFileContent(owner, repoName, 'README.md');
            if (file.error) return { success: false, details: `No pude leer el README de ${owner}/${repoName}. Error: ${file.error}` };

            // Decodificar Base64
            const content = atob(file.content.replace(/\n/g, ''));
            // Cortar si es muy largo para no saturar el prompt (max 2000 chars)
            const truncated = content.substring(0, 2000) + (content.length > 2000 ? "\n... (truncado)" : "");

            return {
                success: true,
                details: `Contenido de ${repoName}/README.md:\n${truncated}`
            };
        } catch (e) {
            return { success: false, details: `Error leyendo repo: ${e.message}` };
        }
    }
};
