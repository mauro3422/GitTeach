import { BaseTool } from './baseTool.js';

export class ReadabilityAuditorTool extends BaseTool {
    constructor() {
        super(
            'readability_audit',
            'Readability & SEO Auditor',
            'Analiza la legibilidad, SEO y atractivo visual de tu README actual.',
            ["Audita mi readme", "Dime qué puedo mejorar", "Analiza mi perfil"],
            {}
        );
    }

    async execute(params, username) {
        const editor = document.getElementById('readme-editor');
        const content = editor?.value || "";

        if (content.length < 50) {
            return {
                success: true,
                content: "> ⚠️ **Nota del Auditor**: Tu README es muy corto aún. Te recomiendo usar la herramienta `auto_bio` para empezar con una buena base.",
                details: "Contenido insuficiente para una auditoría profunda."
            };
        }

        // Análisis heurístico simple
        const hasImages = content.includes('![');
        const hasLinks = content.includes('](');
        const wordCount = content.split(/\s+/).length;
        const hasSocial = content.toLowerCase().includes('connect') || content.toLowerCase().includes('social');

        let score = 5;
        let tips = [];

        if (hasImages) score += 2; else tips.push("- 🖼️ Añade elementos visuales para captar la atención.");
        if (hasLinks) score += 1; else tips.push("- 🔗 Incluye enlaces a tus proyectos o redes.");
        if (hasSocial) score += 2; else tips.push("- 📱 No veo una sección de contacto clara.");
        if (wordCount > 100) score += 0; else tips.push("- 📝 El contenido es un poco escaso, intenta explayarte más en tus logros.");

        const finalScore = Math.min(score, 10);
        const resultMarkdown = `### 🧐 README Audit Result: **${finalScore}/10**\n\n` +
            `He analizado tu perfil y aquí tienes mis sugerencias para llegar al 10:\n\n` +
            `${tips.join('\n')}\n\n` +
            `> *Usa los 'Quick Actions' del chat para aplicar estas mejoras rápidamente.*`;

        return {
            success: true,
            content: resultMarkdown,
            details: "Auditoría de legibilidad completada."
        };
    }
}
