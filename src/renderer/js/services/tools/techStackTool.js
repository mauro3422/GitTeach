import { BaseTool } from './baseTool.js';

export class TechStackTool extends BaseTool {
    constructor() {
        super(
            'tech_stack',
            'Tech Stack Badge Row',
            'Fila visual de iconos basada en tus tecnologías reales (extrae de tus repos).',
            ["Muestra mi stack tecnológico", "Pon mis badges de lenguajes", "Qué tecnologías uso"],
            {}
        );
    }

    async execute(params, username) {
        try {
            const repos = await window.githubAPI.listRepos();
            const languages = [...new Set(repos.map(r => r.language).filter(l => l))].slice(0, 6);

            if (languages.length === 0) {
                return { success: false, details: "No encontré lenguajes en tus repos." };
            }

            // Mapeo de lenguajes a colores oficiales
            const colors = {
                'JavaScript': 'F7DF1E', 'TypeScript': '3178C6', 'Python': '3776AB',
                'Java': 'ED8B00', 'C++': '00599C', 'C': 'A8B9CC', 'Go': '00ADD8',
                'Ruby': 'CC342D', 'PHP': '777BB4', 'Swift': 'F05138', 'Kotlin': '7F52FF',
                'Rust': '000000', 'Dart': '0175C2', 'HTML': 'E34F26', 'CSS': '1572B6'
            };

            const badges = languages.map(lang => {
                const color = colors[lang] || '30363D';
                const safeLang = lang.replace(/\+/g, '%2B').replace(/#/g, '%23');
                return `![${lang}](https://img.shields.io/badge/${safeLang}-${color}?style=for-the-badge&logo=${safeLang.toLowerCase()}&logoColor=white)`;
            }).join(' ');

            const content = `### 🛠️ Tech Stack\n\n${badges}`;

            return {
                success: true,
                content: content,
                details: `Stack generado con ${languages.length} lenguajes de tus repos.`
            };
        } catch (e) {
            return { success: false, details: `Error: ${e.message}` };
        }
    }
}
