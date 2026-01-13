import { BaseTool } from './baseTool.js';

export class SkillsTool extends BaseTool {
    constructor() {
        super(
            'skills_grid',
            'Tech Skills Grid',
            'Genera una cuadrícula elegante de iconos para tus habilidades técnicas.',
            ["Añade mis skills", "Muestra que uso React, Node y Python", "Pon mis tecnologías"],
            {
                skills: 'Lista de tecnologías separadas por coma (ej: react,nodejs,python,docker)',
                theme: 'Estilo de los iconos (flat, flat-square, for-the-badge)'
            }
        );
    }

    async execute(params, username) {
        const skillsList = params.skills ? params.skills.split(',') : [];
        const theme = params.theme || 'for-the-badge';

        if (skillsList.length === 0) {
            return { success: false, details: "No especificaste ninguna tecnología." };
        }

        const badges = skillsList.map(skill => {
            const cleanSkill = skill.trim().toLowerCase();
            // Mapeo simple de nombres a colores oficiales para mejor estética
            const colors = {
                javascript: 'F7DF1E',
                nodejs: '339933',
                react: '61DAFB',
                python: '3776AB',
                docker: '2496ED',
                git: 'F05032',
                mongodb: '47A248',
                typescript: '3178C6'
            };
            const color = colors[cleanSkill] || '30363D';
            return `![${cleanSkill}](https://img.shields.io/badge/${cleanSkill}-${color}?style=${theme}&logo=${cleanSkill}&logoColor=white)`;
        });

        const content = `### 🛠️ Tecnologías y Herramientas\n\n${badges.join(' ')}`;

        return {
            success: true,
            content: content,
            details: `Grid de ${skillsList.length} habilidades generado.`
        };
    }
}
