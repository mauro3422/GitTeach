import { BaseTool } from './baseTool.js';

export class QueryMemoryTool extends BaseTool {
    constructor() {
        super(
            'query_memory',
            'Consultar Memoria Profunda',
            'Busca en el ADN del desarrollador y en el cache de archivos temas específicos sobre tu estilo, hábitos o proyectos pasados.',
            ["¿Qué sabes sobre mis hábitos de nombrado?", "¿Qué proyectos de C++ he hecho?", "Busca en mi memoria sobre SOLID"],
            {
                query: 'Término o tema a buscar en la memoria (ej: hábitos, arquitectura, C++)'
            }
        );
    }

    async execute(params, username) {
        const query = params.query;
        if (!query) return { success: false, details: "Falta el parámetro 'query'." };

        try {
            const dna = await window.cacheAPI.getDeveloperDNA(username);
            const stats = await window.cacheAPI.getStats();

            if (!dna) {
                return {
                    success: false,
                    details: "Aún no tengo un ADN procesado para ti. Necesito completar un escaneo profundo primero."
                };
            }

            // Búsqueda simple en el ADN
            const dnaString = JSON.stringify(dna).toLowerCase();
            const foundInDna = dnaString.includes(query.toLowerCase());

            let result = `### 🧠 RESULTADOS DE MEMORIA PARA: "${query}"\n\n`;

            if (foundInDna) {
                result += `✅ Encontré menciones en tu **Developer DNA**:\n`;
                if (dna.bio.toLowerCase().includes(query.toLowerCase())) {
                    result += `- **Bio**: "${dna.bio}"\n`;
                }
                const traits = dna.traits.filter(t =>
                    t.name.toLowerCase().includes(query.toLowerCase()) ||
                    t.details.toLowerCase().includes(query.toLowerCase())
                );
                traits.forEach(t => {
                    result += `- **Rasgo [${t.name}]**: ${t.details} (Score: ${t.score}%)\n`;
                });
                result += `- **Veredicto Final**: ${dna.verdict}\n`;
            } else {
                result += `❌ No hay menciones directas en tu síntesis de ADN.\n`;
            }

            result += `\n📊 **Estado del Cache**: Tengo ${stats.fileCount} archivos de ${stats.repoCount} repositorios analizados.`;

            return {
                success: true,
                details: result
            };
        } catch (e) {
            return { success: false, details: `Error consultando memoria: ${e.message}` };
        }
    }
}
