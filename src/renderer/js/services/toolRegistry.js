/**
 * ToolRegistry - El catálogo maestro de herramientas (Mambos).
 * Define tanto la lógica de renderizado como el SCHEMA que lee la IA.
 */
export const ToolRegistry = {
    tools: [
        {
            id: 'github_stats',
            name: 'GitHub Stats Banner',
            description: 'Muestra estadísticas generales, puntuación de commits y niveles del perfil. Usa esto si el usuario menciona "stats", "estadísticas", "performance" o "score".',
            examples: ["Pon mis estadísticas de github", "Quiero ver mis stats", "Insertar tabla de rendimiento"],
            schema: {
                theme: 'Aesthetic theme (tokyonight, dracula, radical, etc.)'
            }
        },
        {
            id: 'welcome_header',
            name: 'Welcome Header Animado',
            description: 'Cabecera de bienvenida dinámica con texto. Úsalo para saludar, para el "header" inicial o si mencionan "bienvenida", "hola" o un banner con su nombre.',
            examples: ["Pon un banner de bienvenida", "Quiero un header que diga Hola", "Cabecera animada tipo shark"],
            schema: {
                type: 'Style (waving, wave, egg, shark, rect)',
                color: 'Hex color or "auto"',
                text: 'The text to display',
                fontSize: 'Font size in px (default 60)'
            }
        },
        {
            id: 'tech_stack',
            name: 'Tech Stack Badge Row',
            description: 'Fila visual de iconos y tecnologías. Úsalo si piden "stack", "tecnologías", "herramientas" o "badges" de lenguajes.',
            examples: ["Muestra mi stack tecnológico", "Pon mis badges de lenguajes", "Qué tecnologías uso"],
            schema: {}
        },
        {
            id: 'top_langs',
            name: 'Top Languages Card',
            description: 'Gráfico circular de los lenguajes de programación más usados. Ideal si mencionan "lenguajes", "coding stats" o qué idiomas dominan.',
            examples: ["Gráfico de lenguajes más usados", "Top lenguajes", "Mis idiomas de programación"],
            schema: { theme: 'Theme name' }
        },
        {
            id: 'contribution_snake',
            name: 'Contribution Snake Game',
            description: 'Animación tipo "Snake" (serpiente) que recorre el calendario de contribuciones. Úsalo si mencionan "serpiente", "snake", "juego" o "actividad".',
            examples: ["Pon el juego de la serpiente", "Quiero la snake de contribuciones", "Animación de serpiente"],
            schema: {}
        },
        {
            id: 'list_repos',
            name: 'Listar Repositorios',
            description: 'Obtiene una lista de los repositorios públicos del usuario. Úsalo si el usuario quiere "ver sus proyectos", "listar repos" o "analizar su trabajo".',
            examples: ["Qué repos tengo?", "Lista mis proyectos", "Analiza mis repositorios"],
            schema: {}
        },
        {
            id: 'read_repo',
            name: 'Leer Repositorio (README)',
            description: 'Lee el contenido del README.md de un repositorio específico para analizarlo. Úsalo si piden "leer", "analizar" o "ver" un repo concreto.',
            examples: ["Lee el repo de giteach", "Analiza mi proyecto intro-electron", "Qué hace el repo test?"],
            schema: {
                repo: 'Name of the repository to read',
                owner: 'Owner username (optional, defaults to current user)'
            }
        },
        // --- VISUAL WIDGETS ---
        {
            id: 'github_trophies',
            name: 'GitHub Trophies',
            description: 'Muestra trofeos visuales basados en logros (estrellas, commits, seguidores). Ideal para "logros", "trofeos" o "premios".',
            examples: ["Pon mis trofeos", "Muestra mis logros", "Quiero ver mis medallas"],
            schema: {
                theme: 'Theme name (flat, onedark, gitlab, etc.)'
            }
        },
        {
            id: 'streak_stats',
            name: 'Streak Stats',
            description: 'Muestra la racha actual de contribuciones (días seguidos). Ideal para "racha", "streak", "constancia".',
            examples: ["Pon mi racha de días", "Muestra mi streak", "Cuántos días seguidos llevo?"],
            schema: {
                theme: 'Theme name'
            }
        },
        {
            id: 'profile_views',
            name: 'Contador de Visitas',
            description: 'Un badge simple que cuenta cuántas veces han visto el perfil. Ideal para "visitas", "counter", "visualizaciones".',
            examples: ["Pon un contador de visitas", "Cuánta gente me ve?", "Views counter"],
            schema: {
                color: 'Hex color name (blue, green, brightgreen)'
            }
        }
    ],

    getAIInstructions() {
        return this.tools.map(t => {
            const params = Object.keys(t.schema).length > 0
                ? ` (Parámetros: ${JSON.stringify(t.schema)})`
                : '';
            return `- ${t.id}: ${t.description}${params}`;
        }).join('\n');
    },

    getById(id) {
        return this.tools.find(t => t.id === id) || null;
    }
};
