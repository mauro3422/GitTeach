import { BaseTool } from './baseTool.js';
import { memoryAgent } from '../memory/MemoryAgent.js';
import { Logger } from '../../utils/logger.js';

export class QueryMemoryTool extends BaseTool {
    constructor() {
        super(
            'query_memory',
            'Consult Technical Memory (Smart RAG)',
            'REQUIRED for any task involving: Generating READMEs, Writing Documentation, Summarizing Code, or Answering technical questions. This tool retrieves deep technical context using intelligent source selection.',
            ["Generame un README", "¿Cómo funciona el login?", "Describe mi proyecto", "Escribe mi bio"],
            {
                query: 'La consulta original del usuario',
                searchTerms: 'Array de términos técnicos para buscar',
                memorySource: 'Fuente: vectors, curated, dna, o all'
            }
        );
    }

    async execute(params, username) {
        const { query, searchTerms = [], memorySource = 'curated' } = params;

        Logger.info('QueryMemoryTool', `Executing Smart RAG: Source=${memorySource}, Terms=[${searchTerms.join(', ')}]`);

        try {
            // Use the new Smart RAG method
            const contextBlock = await memoryAgent.retrieveFromSource({
                searchTerms: searchTerms.length > 0 ? searchTerms : [query],
                memorySource,
                username
            });

            if (!contextBlock || contextBlock.length < 50) {
                return {
                    success: true,
                    details: `Búsqueda en "${memorySource}" para: [${searchTerms.join(', ')}]. Sin resultados relevantes.`
                };
            }

            return {
                success: true,
                systemContext: contextBlock,
                details: `Memoria "${memorySource}" consultada exitosamente. ${searchTerms.length} términos procesados. Contexto inyectado.`
            };

        } catch (error) {
            Logger.error('QueryMemoryTool', `Error: ${error.message}`);
            return {
                success: false,
                details: `Error al consultar memoria: ${error.message}`
            };
        }
    }
}

