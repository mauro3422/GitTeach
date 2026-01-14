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

        // NEW: Track summaries per repo for cumulative context
        this.repoContexts = new Map();
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

        // Wait for all workers to finish
        await Promise.all(workers);

        this.isProcessing = false;
        return this.results;
    }

    /**
     * Get cumulative context for a repo (previous file summaries)
     * Limits to last 5 files to avoid context overflow
     */
    getRepoContext(repoName) {
        const files = this.repoContexts.get(repoName) || [];
        if (files.length === 0) return '';

        const recent = files.slice(-5); // Last 5 files max
        return recent.map(f => `- ${f.path}: ${f.summary}`).join('\n');
    }

    /**
     * Add file summary to repo context
     */
    addToRepoContext(repoName, filePath, summary) {
        if (!this.repoContexts.has(repoName)) {
            this.repoContexts.set(repoName, []);
        }
        // Keep short summary for context (max 80 chars)
        const shortSummary = summary.substring(0, 80).split('\n')[0];
        this.repoContexts.get(repoName).push({ path: filePath, summary: shortSummary });
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

                // Notify progress
                this.processedCount++;

                // Add to repo context for future files
                this.addToRepoContext(item.repo, item.path, summary);

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
     * Call AI to summarize a file
     * Includes repo context from previously analyzed files for better understanding
     */
    async summarizeWithAI(aiService, item) {
        const snippet = item.content.substring(0, 1000); // Limit input
        const repoContext = this.getRepoContext(item.repo);

        const systemPrompt = `You are a TECHNICAL TALENT ANALYST. Your summaries will be used to build a DEVELOPER PORTFOLIO.
Your goal is to identify STRENGTHS and PATTERNS in the analyzed code.

For each file, respond in a single concise line:
1. What does the code do? (Functionality)
2. What STRENGTH does it demonstrate? (e.g.: "Concurrency mastery", "SOLID", "Optimization")
3. Is it PORTFOLIO material? (e.g.: "Complex logic", "Clean architecture")

SHORT RESPONSE (Max 40 words): [Summary] + [Strength] + [Impact]`;

        // Include repo context if available
        let userPrompt = '';
        if (repoContext) {
            userPrompt = `REPO CONTEXT (previously analyzed files):
${repoContext}

CURRENT FILE: ${item.repo}/${item.path}
\`\`\`
${snippet}
\`\`\`
Analyze this file considering its relationship to the above context:`;
        } else {
            userPrompt = `File: ${item.repo}/${item.path}
\`\`\`
${snippet}
\`\`\`
Summarize strengths and patterns:`;
        }

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
     * Clear queue and contexts
     */
    clear() {
        this.queue = [];
        this.results = [];
        this.processedCount = 0;
        this.totalQueued = 0;
        this.repoContexts.clear();
    }
}
