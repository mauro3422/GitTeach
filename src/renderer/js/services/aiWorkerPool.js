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
import { CacheRepository } from '../utils/cacheRepository.js';
import { DebugLogger } from '../utils/debugLogger.js';
import { FileClassifier } from '../utils/fileClassifier.js';

export class AIWorkerPool {
    constructor(workerCount = 3, coordinator = null, debugLogger = null) {
        this.workerCount = workerCount;
        this.coordinator = coordinator; // NEW: Link to central movement
        this.debugLogger = debugLogger || DebugLogger; // INJECTION OR FALLBACK

        console.log(`[AIWorkerPool] Constructor - Injected Logger: ${!!debugLogger}, IsActive: ${this.debugLogger.isActive()}, Path: ${this.debugLogger.sessionPath}`);
        this.queue = [];
        this.activeWorkers = 0;
        this.results = [];
        this.onProgress = null;
        this.onFileProcessed = null;
        this.onBatchComplete = null; // NEW: Streaming callback
        this.batchSize = 5; // Emit every 5 files
        this.batchBuffer = []; // Temporary buffer
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

        // NEW: Flush remaining buffer
        if (this.onBatchComplete && this.batchBuffer.length > 0) {
            this.onBatchComplete(this.batchBuffer);
            this.batchBuffer = [];
        }

        this.isProcessing = false;
        return this.results;
    }

    /**
     * Get cumulative context for a repo (Golden Knowledge + Recent Findings)
     */
    getRepoContext(repoName) {
        const ctx = this.repoContexts.get(repoName);
        if (!ctx) return '';

        let context = '';
        if (ctx.goldenKnowledge) {
            context += `[GOLDEN KNOWLEDGE BASE (PREVIOUSLY COMPACTED)]:\n${ctx.goldenKnowledge}\n\n`;
        }

        if (ctx.recentFindings.length > 0) {
            context += `[RECENT DISCOVERIES]:\n`;
            context += ctx.recentFindings.map(f => `- ${f.path}: ${f.summary}`).join('\n');
        }

        return context;
    }

    /**
     * Add file summary to repo context and trigger compaction if needed
     */
    async addToRepoContext(repoName, filePath, summary, aiService) {
        if (!this.repoContexts.has(repoName)) {
            this.repoContexts.set(repoName, {
                goldenKnowledge: '',
                recentFindings: [],
                compactionInProgress: false
            });
        }

        const ctx = this.repoContexts.get(repoName);
        // Keep slightly more descriptive summary for compaction (max 150 chars)
        const cleanSummary = summary.split('\n')[0].substring(0, 150);
        ctx.recentFindings.push({ path: filePath, summary: cleanSummary });

        // Adaptive Compaction: If we have enough recent findings, merge them into Golden Knowledge
        if (ctx.recentFindings.length >= 10 && !ctx.compactionInProgress) {
            this.runCompaction(repoName, aiService);
        }
    }

    /**
     * Internal: Run compaction without blocking the worker
     */
    async runCompaction(repoName, aiService) {
        const ctx = this.repoContexts.get(repoName);
        ctx.compactionInProgress = true;

        try {
            Logger.worker('POOL', `[${repoName}] Compactando memoria técnica (${ctx.recentFindings.length} archivos)...`);

            const systemPrompt = `You are a TECHNICAL KNOWLEDGE SYNTHESIZER. 
Your goal is to merge current knowledge with new findings into a single, DENSE Technical Profile.
Preserve architectural patterns, key file roles, and technical evidence.`;

            const userPrompt = `REPO: ${repoName}
            EXISTING GOLDEN KNOWLEDGE:
            ${ctx.goldenKnowledge || 'None yet.'}

            NEW DISCOVERIES TO MERGE:
            ${ctx.recentFindings.map(f => `- ${f.path}: ${f.summary}`).join('\n')}

            Synthesize into a short, DENSE paragraph (Max 120 words) representing the accumulated architectural understanding:`;

            const compacted = await aiService.callAI(systemPrompt, userPrompt, 0.1);

            // Atomically update
            ctx.goldenKnowledge = compacted;
            ctx.recentFindings = [];
            Logger.worker('POOL', `[${repoName}] Conocimiento compactado con éxito ✅`);
        } catch (e) {
            console.warn(`[Compaction Error] ${repoName}:`, e);
        } finally {
            ctx.compactionInProgress = false;
        }
    }

    /**
     * Worker individual: toma items de la cola y los procesa
     */
    async runWorker(workerId, aiService) {
        Logger.worker(workerId, 'Iniciando...');
        let claimedRepo = null;
        let lastProcessedPath = null;

        while (true) {
            // Intentar tomar el siguiente item del repo reclamado, o reclamar uno nuevo
            const input = this.getNextItem(workerId, claimedRepo, lastProcessedPath);

            if (!input) {
                // Si no hay nada del repo actual, soltar reclamo y buscar en general
                if (claimedRepo) {
                    Logger.worker(workerId, `Finalizado repo [${claimedRepo}]. Limpiando afinidades.`);
                    claimedRepo = null;
                    lastProcessedPath = null;
                    continue;
                }
                Logger.worker(workerId, 'Cola vacía o repos ocupados, terminando');
                break;
            }

            const isBatch = input.isBatch;
            const items = isBatch ? input.items : [input];
            const nextRepo = items[0].repo;

            // DETECCION DE CAMBIO DE REPO: Resetear afinidad y CONTEXTO si saltamos a otro repo diferente
            if (claimedRepo && nextRepo !== claimedRepo) {
                Logger.worker(workerId, `>>> CAMBIO DE CONTEXTO: De [${claimedRepo}] a [${nextRepo}]. Reseteando cerebro.`);
                lastProcessedPath = null;
                // CONTEXT RESET: Clear accumulated context to prevent "inercia" between repos
                if (this.repoContexts.has(claimedRepo)) {
                    const oldCtx = this.repoContexts.get(claimedRepo);
                    oldCtx.recentFindings = []; // Fresh start for next repo
                }
            }

            claimedRepo = nextRepo;
            lastProcessedPath = items[items.length - 1].path;

            // Marcar items como en proceso
            items.forEach(i => i.status = 'processing');

            if (isBatch) {
                Logger.worker(workerId, `Procesando LOTE [${claimedRepo}] (${items.length} archivos)`);
            } else {
                Logger.worker(workerId, `Procesando [${claimedRepo}]: ${input.path}`);
            }

            try {
                // Llamar a la IA para resumir el archivo o lote
                let { prompt, summary } = await this.summarizeWithAI(aiService, input);

                // LOOSE SCHEMA PARSER (Plain Text with Tags)
                // Expected format: [DOMAIN] ... | Evidence: ... OR just SKIP
                let parsed = null;
                const trimmed = summary.trim();

                // Check for SKIP
                if (trimmed.toUpperCase().startsWith('SKIP') || trimmed.includes('[SKIP]')) {
                    parsed = { tool: 'skip' };
                    summary = "SKIP: Content not relevant or empty.";
                } else {
                    // Try to extract structured data from plain text
                    // Format: [DOMAIN] Description | Evidence: fragment
                    const domainMatch = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/s);
                    if (domainMatch) {
                        const domain = domainMatch[1]; // e.g., "Business Logic"
                        const rest = domainMatch[2];
                        const evidenceMatch = rest.match(/\|\s*Evidence:\s*(.+)$/si);
                        const description = evidenceMatch ? rest.replace(evidenceMatch[0], '').trim() : rest.trim();
                        const evidence = evidenceMatch ? evidenceMatch[1].trim() : '';

                        parsed = {
                            tool: 'analysis',
                            params: {
                                insight: description.substring(0, 100),
                                technical_strength: domain,
                                impact: evidence || 'See analysis'
                            }
                        };
                    }
                    // If no structured format, keep raw summary (it's still valid freeform analysis)
                }

                // Actualizar resultados
                items.forEach(item => {
                    item.status = 'completed';
                    item.summary = summary; // Los batches comparten el insight técnico por ahora

                    const resultItem = {
                        repo: item.repo,
                        path: item.path,
                        summary: summary,
                        workerId: workerId,
                        classification: parsed?.params?.technical_strength || 'General'
                    };

                    this.results.push(resultItem);

                    // NEW: Streaming Buffer logic
                    this.batchBuffer.push(resultItem);
                    if (this.onBatchComplete && this.batchBuffer.length >= this.batchSize) {
                        const batch = [...this.batchBuffer];
                        this.batchBuffer = []; // Clear immediately
                        this.onBatchComplete(batch);
                    }

                    // Add to repo context for future files (Individual context enrichment)
                    this.addToRepoContext(item.repo, item.path, summary, aiService);

                    // NEW: Update Coordinator with REAL summary (Overwriting snippets)
                    if (this.coordinator) {
                        this.coordinator.markCompleted(item.repo, item.path, summary, parsed || null);
                    }

                    // AUDIT LOGGING: Persist finding to specific worker JSONL (Audit Trail)
                    CacheRepository.setWorkerAudit(workerId, {
                        timestamp: new Date().toISOString(),
                        repo: item.repo,
                        path: item.path,
                        summary: summary,
                        classification: parsed?.params?.technical_strength || 'General'
                    });
                });

                // Debug logging - capture worker I/O with FULL PROMPT
                // DIAGNOSTIC LOG
                if (!this.debugLogger.isActive()) {
                    console.warn(`[AIWorkerPool] ⚠️ DebugLogger INACTIVE. Enabled: ${this.debugLogger.enabled}, Session: ${this.debugLogger.sessionPath}`);
                } else {
                    // console.log(`[AIWorkerPool] Logging worker ${workerId}...`);
                }

                this.debugLogger.logWorker(workerId, {
                    input: isBatch ? { repo: claimedRepo, paths: items.map(i => i.path) } : { repo: input.repo, path: input.path, contentLength: input.content?.length },
                    prompt: prompt,
                    output: summary
                });

                // Notify progress
                this.processedCount += items.length;

                if (this.onFileProcessed) {
                    items.forEach(item => this.onFileProcessed(item.repo, item.path, summary));
                }

                if (this.onProgress) {
                    const percent = Math.round((this.processedCount / this.totalQueued) * 100);
                    this.onProgress({
                        workerId,
                        processed: this.processedCount,
                        total: this.totalQueued,
                        percent,
                        file: lastProcessedPath
                    });
                }

                // Notify progress
                this.processedCount += items.length;

                if (this.onFileProcessed) {
                    items.forEach(item => this.onFileProcessed(item.repo, item.path, summary));
                }

                // ... (progress event)

            } catch (error) {
                Logger.worker(workerId, `Error: ${error.message}`);

                // CRITICAL FIX: Log failure to disk too
                this.debugLogger.logWorker(workerId, {
                    input: isBatch ? { repo: claimedRepo, paths: items.map(i => i.path) } : { repo: input.repo, path: input.path },
                    prompt: "ERROR_DURING_EXECUTION", // Prompt might not be available if generation failed early
                    output: null,
                    error: error.message
                });

                items.forEach(item => {
                    item.status = 'failed';
                    item.error = error.message;
                });
                this.processedCount += items.length;
            }
        }
    }

    /**
     * Obtiene el siguiente item o lote (batch) de items pendientes.
     * Prioriza:
     * 1. Archivos con afinidad de nombre al último procesado (ej. config -> dependientes).
     * 2. Archivos del mismo repositorio (stickiness).
     * 3. Batching de archivos pequeños.
     */
    getNextItem(workerId, claimedRepo, lastProcessedPath = null) {
        const MAX_BATCH_SIZE = 3;
        const MIN_CONTENT_FOR_BATCH = 1000;

        // 1. Intentar seguir con el repo actual y buscar afinidades
        if (claimedRepo) {
            const pendingInRepo = this.queue.filter(item => item.status === 'pending' && item.repo === claimedRepo);

            if (pendingInRepo.length > 0) {
                // Afinidad de nombre: si el último fue "config", priorizar archivos que se llamen parecido o estén en el mismo dir
                if (lastProcessedPath) {
                    const lastDir = lastProcessedPath.split('/').slice(0, -1).join('/');
                    const lastNameBase = lastProcessedPath.split('/').pop().split('.')[0].toLowerCase();

                    const affinityItem = pendingInRepo.find(item => {
                        const itemDir = item.path.split('/').slice(0, -1).join('/');
                        const itemNameBase = item.path.split('/').pop().split('.')[0].toLowerCase();
                        return itemDir === lastDir || itemNameBase.includes(lastNameBase) || lastNameBase.includes(itemNameBase);
                    });

                    if (affinityItem) {
                        affinityItem.status = 'assigned';
                        return affinityItem;
                    }
                }

                // Lógica de Batching: si el primero es pequeño, buscar más pequeños
                const first = pendingInRepo[0];
                if (first.content.length < MIN_CONTENT_FOR_BATCH) {
                    const batch = [];
                    for (const item of pendingInRepo) {
                        if (item.content.length < MIN_CONTENT_FOR_BATCH && batch.length < MAX_BATCH_SIZE) {
                            item.status = 'assigned';
                            batch.push(item);
                        } else if (batch.length === 0) {
                            item.status = 'assigned';
                            return item;
                        } else {
                            break;
                        }
                    }
                    return batch.length > 1 ? { repo: claimedRepo, isBatch: true, items: batch } : batch[0];
                } else {
                    first.status = 'assigned';
                    return first;
                }
            }
        }

        // 2. Si no hay más de ese repo o afinidad, buscar un repo "libre"
        const activeRepos = new Set(this.queue.filter(i => i.status === 'processing' || i.status === 'assigned').map(i => i.repo));
        const nextPending = this.queue.find(item => item.status === 'pending' && !activeRepos.has(item.repo));

        if (nextPending) {
            const repo = nextPending.repo;
            const repoItems = this.queue.filter(item => item.status === 'pending' && item.repo === repo);
            const first = repoItems[0];

            if (first.content.length < MIN_CONTENT_FOR_BATCH) {
                const batch = [];
                for (const item of repoItems) {
                    if (item.content.length < MIN_CONTENT_FOR_BATCH && batch.length < MAX_BATCH_SIZE) {
                        item.status = 'assigned';
                        batch.push(item);
                    } else if (batch.length === 0) {
                        item.status = 'assigned';
                        return item;
                    } else {
                        break;
                    }
                }
                return batch.length > 1 ? { repo: repo, isBatch: true, items: batch } : batch[0];
            } else {
                first.status = 'assigned';
                return first;
            }
        }

        // 3. Fallback: cualquier cosa pendiente
        const anyItem = this.queue.find(item => item.status === 'pending');
        if (anyItem) {
            anyItem.status = 'assigned';
            return anyItem;
        }

        return null;
    }

    /**
     * Call AI to summarize a file or a batch of files
     */
    async summarizeWithAI(aiService, input) {
        const isBatch = input.isBatch;
        const items = isBatch ? input.items : [input];
        const repo = items[0].repo;

        // NOTE: Accumulated context removed (Background Worker style)
        // Curation is now handled by a separate agent

        // EVIDENCE-FIRST PROMPT: Forces model to extract real code BEFORE classifying
        // This prevents "example pollution" where model copies prompt examples
        const systemPrompt = `You analyze code files for developer profiling.

STEP 1: Extract the most important function, class, or variable name from the code.
STEP 2: Based on that evidence, classify the domain.

OUTPUT FORMAT (exactly one line):
[DOMAIN] Brief description | Evidence: <paste_actual_code_fragment>

DOMAIN OPTIONS: UI, Backend, Business, System, Game, Script, Data, Science, DevOps, Config

IMPORTANT:
- The evidence MUST be copied from the actual code shown below.
- STRICT RULE: Do not classify as "Game" unless it mentions game engines (Unity, Godot), sprites, or gameplay loops. 
- Administrative, Medical, or Management code is "Business" or "System", NOT "Game".
- Science or Physics simulations are "Science", NOT "Game".
- If code is empty or under 50 characters, output: SKIP
- Never invent function names. Only cite what exists in the code.`;

        // NEW: Get domain hint from FileClassifier
        const domainHint = FileClassifier.getDomainHint(items[0].path, items[0].content);

        // NEW: Validate language integrity (detect Python in .js, etc.)
        const langCheck = FileClassifier.validateLanguageIntegrity(items[0].path, items[0].content);
        const langWarning = langCheck.valid ? '' : `\n⚠️ ANOMALY DETECTED: ${langCheck.anomaly}. Report this mismatch.\n`;

        // SIMPLIFIED PROMPT (Background Worker Style - No accumulated context)
        let userPrompt;

        if (isBatch) {
            userPrompt = `Analyze these files from ${repo}:\n`;
            items.forEach((item) => {
                userPrompt += `\n--- ${item.path} ---\n\`\`\`\n${item.content.substring(0, 800)}\n\`\`\`\n`;
            });
            userPrompt += `\nIdentify the synergy between these files and what they demonstrate about the developer:`;
        } else {
            // Include domain hint and language warning if available
            const hintLine = domainHint ? `\n${domainHint}\n` : '';
            userPrompt = `${langWarning}${hintLine}Analyze this file from ${repo}: ${items[0].path}
\`\`\`
${items[0].content.substring(0, 1500)}
\`\`\`
Tell me what it demonstrates about the developer:`;
        }

        // PRE-FILTER: Use FileClassifier instead of inline logic
        const skipCheck = FileClassifier.shouldSkip(items[0].path, items[0].content);
        if (skipCheck.skip && !isBatch) {
            return { prompt: 'PRE-FILTERED', summary: `SKIP: ${skipCheck.reason}` };
        }

        let summary = await aiService.callAI(systemPrompt, userPrompt, 0.1);

        // POST-PROCESS: Automatically tag anomalies (don't rely on AI to report them)
        if (!langCheck.valid) {
            summary = `⚠️ INTEGRITY ANOMALY: ${langCheck.anomaly} | ${summary}`;
        }

        return { prompt: `${systemPrompt}\n\n${userPrompt}`, summary };
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
