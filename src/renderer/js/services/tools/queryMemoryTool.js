import { BaseTool } from './baseTool.js';
import { memoryAgent } from '../memory/MemoryAgent.js';

export class QueryMemoryTool extends BaseTool {
    constructor() {
        super(
            'query_memory',
            'Consult Technical Memory (RAG)',
            'REQUIRED for any task involving: Generating READMEs, Writing Documentation, Summarizing Code, or Answering "How does X work?". This tool retrieves the deep technical context/vectors needed to write accurate content.',
            ["Generame un README", "¿Cómo funciona el login?", "Describe mi proyecto", "Documentación técnica"],
            {
                query: 'La consulta técnica específica para buscar en los vectores (ej: "autenticación jwt", "configuración base de datos")'
            }
        );
    }

    async execute(params, username) {
        const query = params.query;
        if (!query) {
            return {
                success: false,
                details: "No se proporcionó ninguna consulta (query) para buscar."
            };
        }

        try {
            // Retrieve context using the MemoryAgent (RAG)
            const contextBlock = await memoryAgent.retrieveContext(query);

            if (!contextBlock || contextBlock.length < 50) {
                return {
                    success: true,
                    // No systemContext implies no update to AI memory
                    details: `Búsqueda ejecutada para: "${query}". Sin resultados relevantes hallados en vectores.`
                };
            }

            return {
                success: true,
                systemContext: contextBlock, // INYECTAR EN MEMORIA, NO EN EDITOR
                details: `Memoria consultada exitosamente para: "${query}". Contexto inyectado en la sesión.`
            };

        } catch (error) {
            return {
                success: false,
                details: `Error al consultar memoria vectorial: ${error.message}`
            };
        }
    }
}
