/**
 * AIWorkerPool - Gestiona N workers de IA que procesan archivos en paralelo
 * Usa los slots del llama-server para concurrencia real en GPU
 * UPDATED: Usa Logger centralizado
 * 
 * SOLID Principles:
 * - S: Solo gestiona la cola de trabajos y workers
 * - O: Extensible via onFileProcessed callback
 * - L: N/A (no herencia)
 * - I: Interface mínima (enqueue, processAll)
 * - D: Depende de AIService via inyección
 */
import { Logger } from '../utils/logger.js';

export class AIWorkerPool {
    constructor(workerCount = 4) {
        this.workerCount = workerCount;
        this.queue = [];
        this.activeWorkers = 0;
        this.results = [];
        this.onProgress = null;
        this.onFileProcessed = null;
        this.isProcessing = false;
        this.processedCount = 0;
        this.totalQueued = 0;
    }

    /**
     * Encola un archivo para ser procesado por un worker
     */
    enqueue(repoName, filePath, content, sha) {
        this.queue.push({
            repo: repoName,
            path: filePath,
            content: content,
            sha: sha,
            status: 'pending'
        });
        this.totalQueued++;
    }

    /**
     * Encola múltiples archivos
     */
    enqueueBatch(files) {
        files.forEach(f => this.enqueue(f.repo, f.path, f.content, f.sha));
    }

    /**
     * Procesa toda la cola usando N workers paralelos
     * Cada worker hace una llamada HTTP al llama-server (usa slots diferentes)
     */
    async processAll(aiService) {
        if (this.isProcessing) {
            console.warn('[AIWorkerPool] Already processing');
            return this.results;
        }

        this.isProcessing = true;
        this.results = [];

        // Crear N workers que procesan en paralelo
        const workers = [];
        for (let i = 0; i < this.workerCount; i++) {
            workers.push(this.runWorker(i + 1, aiService));
        }

        // Esperar a que todos los workers terminen
        await Promise.all(workers);

        this.isProcessing = false;
        return this.results;
    }

    /**
     * Worker individual: toma items de la cola y los procesa
     */
    async runWorker(workerId, aiService) {
        Logger.worker(workerId, 'Iniciando...');

        while (true) {
            // Tomar siguiente item de la cola
            const item = this.getNextItem();
            if (!item) {
                Logger.worker(workerId, 'Cola vacía, terminando');
                break;
            }

            item.status = 'processing';
            Logger.worker(workerId, `Procesando: ${item.repo}/${item.path}`);

            try {
                // Llamar a la IA para resumir el archivo
                const summary = await this.summarizeWithAI(aiService, item);

                item.status = 'completed';
                item.summary = summary;
                this.results.push({
                    repo: item.repo,
                    path: item.path,
                    summary: summary,
                    workerId: workerId
                });

                // Notificar progreso
                this.processedCount++;
                if (this.onFileProcessed) {
                    this.onFileProcessed(item.repo, item.path, summary);
                }
                if (this.onProgress) {
                    const percent = Math.round((this.processedCount / this.totalQueued) * 100);
                    this.onProgress({
                        workerId,
                        processed: this.processedCount,
                        total: this.totalQueued,
                        percent,
                        file: item.path
                    });
                }

            } catch (error) {
                Logger.worker(workerId, `Error: ${error.message}`);
                item.status = 'failed';
                item.error = error.message;
                this.processedCount++;
            }
        }
    }

    /**
     * Obtiene el siguiente item pendiente de la cola (thread-safe via JS event loop)
     */
    getNextItem() {
        const index = this.queue.findIndex(item => item.status === 'pending');
        if (index === -1) return null;

        const item = this.queue[index];
        item.status = 'assigned';
        return item;
    }

    /**
     * Llama a la IA para resumir un archivo
     * Prompt optimizado para respuestas cortas (~50 tokens)
     */
    async summarizeWithAI(aiService, item) {
        const snippet = item.content.substring(0, 1000); // Limitar input

        const systemPrompt = `Eres un ANALISTA DE TALENTO TÉCNICO. Tus resúmenes serán usados para construir un PORTAFOLIO DE DESARROLLADOR.
Tu meta es identificar FORTALEZAS y PATRONES en el código analizado.

Para cada archivo, responde en una sola línea concisa:
1. ¿Qué hace el código? (Funcionalidad)
2. ¿Qué FORTALEZA demuestra? (ej: "Dominio de concurrencia", "SOLID", "Optimización")
3. ¿Es material de PORTAFOLIO? (ej: "Lógica compleja", "Arquitectura limpia")

RESPUESTA CORTA (Máx 40 palabras): [Resumen] + [Fortaleza] + [Impacto]`;

        const userPrompt = `Archivo: ${item.repo}/${item.path}
\`\`\`
${snippet}
\`\`\`
Resume fortalezas y patrones del código:`;

        return await aiService.callAI(systemPrompt, userPrompt, 0.0);
    }

    /**
     * Obtiene estadísticas actuales
     */
    getStats() {
        return {
            queued: this.totalQueued,
            processed: this.processedCount,
            pending: this.queue.filter(i => i.status === 'pending').length,
            failed: this.queue.filter(i => i.status === 'failed').length,
            percent: this.totalQueued > 0
                ? Math.round((this.processedCount / this.totalQueued) * 100)
                : 0
        };
    }

    /**
     * Limpia la cola
     */
    clear() {
        this.queue = [];
        this.results = [];
        this.processedCount = 0;
        this.totalQueued = 0;
    }
}
