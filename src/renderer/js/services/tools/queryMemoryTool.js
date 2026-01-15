import { BaseTool } from './baseTool.js';

export class QueryMemoryTool extends BaseTool {
    constructor() {
        super(
            'query_memory',
            'Consultar Memoria Técnica Profunda',
            'Busca en la Identidad Técnica del desarrollador y en el cache de hallazgos temas específicos sobre su estilo, hábitos o patrones detectados.',
            ["¿Qué sabes sobre mis hábitos de nombrado?", "¿Qué proyectos de C++ he hecho?", "Busca en mi memoria sobre SOLID"],
            {
                query: 'Término o tema a buscar en la memoria (ej: hábitos, arquitectura, C++)',
                domain: 'Opcional: Filtrar por dominio (UI, System, DevOps, etc.)'
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
                    details: "Aún no tengo una Identidad Técnica procesada para ti. Necesito completar un escaneo profundo primero."
                };
            }

            // Búsqueda simple en la Identidad Sintentizada
            const dnaString = JSON.stringify(dna).toLowerCase();
            const foundInDna = dnaString.includes(query.toLowerCase());

            let result = `### 🧠 RESULTADOS DE MEMORIA TÉCNICA PARA: "${query}"\n\n`;

            if (foundInDna) {
                result += `✅ Encontré menciones en tu **Identidad Técnica**:\n`;
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

            result += `📊 **Estado del Cache**: Tengo ${stats.fileCount} archivos de ${stats.repoCount} repositorios analizados.\n\n`;

            // Búsqueda en Hallazgos Técnicos (Traceability Map del AIService)
            try {
                const { AIService } = await import('../aiService.js');
                const context = AIService.currentSessionContext;
                if (context && context.includes("MAPA DE TRAZABILIDAD")) {
                    const mapSection = context.split("MAPA DE TRAZABILIDAD):")[1]?.split("---")[0];
                    if (mapSection && mapSection.toLowerCase().includes(query.toLowerCase())) {
                        result += `🔍 **Evidencias Técnicas encontradas en el Mapper**:\n`;
                        const lines = mapSection.split('\n');
                        let matchedLines = 0;
                        lines.forEach(line => {
                            if (line.toLowerCase().includes(query.toLowerCase()) && matchedLines < 10) {
                                result += `${line}\n`;
                                matchedLines++;
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn("[QueryMemoryTool] No se pudo acceder al mapa de trazabilidad del AIService.");
            }

            return {
                success: true,
                details: result
            };
        } catch (e) {
            return { success: false, details: `Error consultando memoria: ${e.message}` };
        }
    }
}
