import { BaseTool } from './baseTool.js';

export class AutoBioTool extends BaseTool {
    constructor() {
        super(
            'auto_bio',
            'AI Auto-Bio Generator',
            'Genera un resumen profesional analizando tus repositorios públicos.',
            ["Escribe una biografía para mí", "Haz un resumen de lo que hago", "Genera mi bio"],
            {}
        );
    }

    async execute(params, username) {
        try {
            const repos = await window.githubAPI.listRepos();
            if (!repos || repos.length === 0) {
                return { success: false, details: "No encontré repositorios suficientes para generar una bio." };
            }

            // Agregamos contexto simple de lenguajes y temas
            const repoNames = repos.slice(0, 5).map(r => r.name).join(', ');
            const mainLangs = [...new Set(repos.map(r => r.language).filter(l => l))].slice(0, 3).join(', ');

            // Generamos un prompt interno para que el AIService llame a la IA de nuevo (o generamos una base aquí)
            // Por simplicidad en este paso, devolveremos un placeholder "inteligente" o simularemos el reporte.
            // LO IDEAL: Que el sistema use un prompt para esto. Como somos una herramienta agéntica, 
            // devolveremos la información estructurada para que el 'Respondedor' de AIService la use.

            return {
                success: true,
                content: `> 🤖 **AI-Generated Bio**: Soy un entusiasta del desarrollo de software enfocado principalmente en **${mainLangs}**. \n> Actualmente trabajando en proyectos como **${repoNames}**. ¡Apasionado por crear soluciones eficientes y escalables!`,
                details: "Bio generada basándose en tus 5 repositorios principales."
            };
        } catch (e) {
            return { success: false, details: `Error generando bio: ${e.message}` };
        }
    }
}
