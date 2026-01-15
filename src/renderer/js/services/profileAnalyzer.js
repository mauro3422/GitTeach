/**
 * ProfileAnalyzer - Orquestador de agentes en paralelo para analizar el perfil de GitHub
 * REFACTORED: Ahora delega a módulos especializados (SRP compliant)
 * 
 * Módulos:
 * - CodeScanner: Escaneo de repositorios y archivos
 * - DeepCurator: Curación Map-Reduce y AI Insights
 * - BackgroundAnalyzer: Análisis en segundo plano
 */
import { AIService } from './aiService.js';
import { CoordinatorAgent } from './coordinatorAgent.js';
import { AIWorkerPool } from './aiWorkerPool.js';
import { CodeScanner } from './codeScanner.js';
import { DeepCurator } from './deepCurator.js';
import { BackgroundAnalyzer } from './backgroundAnalyzer.js';
import { MetabolicAgent } from './metabolicAgent.js';
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';

export class ProfileAnalyzer {
    constructor(debugLogger = null) {
        this.results = {
            mainLangs: [],
            topRepos: [],
            totalStars: 0,
            summary: "",
            suggestions: []
        };
        this.isAnalyzing = false;

        // Core components
        this.coordinator = new CoordinatorAgent();
        // INJECT: Pass debugLogger to WorkerPool so it uses the one with FS access (from Tracer)
        // REVERT: Back to 4 workers as per user request (issues were due to zombie processes, not concurrency count)
        this.workerPool = new AIWorkerPool(4, this.coordinator, debugLogger);

        // Specialized modules
        this.codeScanner = new CodeScanner(this.coordinator, this.workerPool);
        this.deepCurator = new DeepCurator();
        this.metabolicAgent = new MetabolicAgent();
        // INJECT: Pass debugLogger to BackgroundAnalyzer to capture its "workers"
        this.backgroundAnalyzer = new BackgroundAnalyzer(this.coordinator, this.deepCurator, debugLogger);
    }

    async analyze(username, onStep = null) {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        try {
            // Obtener ADN cacheado si existe
            const cachedDNA = await CacheRepository.getDeveloperDNA(username);

            // Fase 1: Obtener datos en paralelo
            const [repos, readmeData, audit] = await Promise.all([
                (typeof window !== 'undefined' && window.githubAPI) ? window.githubAPI.listRepos() : Promise.resolve([]),
                (typeof window !== 'undefined' && window.githubAPI) ? window.githubAPI.getProfileReadme(username) : Promise.resolve(''),
                this.runAuditorAgent(username)
            ]);

            // Fase 2: Escaneo profundo de código (SOLO SI HAY IA)
            let allFindings = [];
            let codeInsights = [];

            if (typeof window !== 'undefined' && !window.AI_OFFLINE) {
                allFindings = await this.codeScanner.scan(username, repos, onStep);
                codeInsights = this.codeScanner.curateFindings(allFindings);
            } else {
                Logger.info('ANALYZER', 'IA Offline o Entorno Mock. Saltando escaneo profundo.');
            }

            // Fase 3: Procesamiento de lenguajes
            const langData = this.processLanguages(repos);

            // Validación de datos reales (SOLO SI HAY IA)
            const hasRealData = codeInsights && codeInsights.length > 0;
            if (!hasRealData && typeof window !== 'undefined' && !window.AI_OFFLINE) {
                Logger.warn('WARNING', 'No se pudo extraer código real. Los Workers reportan fallos de acceso.');
            }

            // Fase 4: AI Insights
            let aiInsight = { summary: "IA Offline. Encienda su servidor para obtener insights.", suggestions: [] };
            if (typeof window !== 'undefined' && !window.AI_OFFLINE) {
                aiInsight = await this.deepCurator.getAIInsights(username, langData, codeInsights, hasRealData);
            }

            // Guardar resultados
            this.results = {
                summary: aiInsight.summary,
                suggestions: aiInsight.suggestions,
                mainLangs: langData,
                topRepos: repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3),
                audit: audit,
                deepScan: codeInsights,
                failedFiles: this.coordinator.inventory.failedFiles.length,
                timestamp: new Date().toISOString()
            };

            // Inyectar contexto inicial
            AIService.setSessionContext(this.getFreshContext(username, cachedDNA));

            if (this.results.audit && this.results.audit.score < 50) {
                Logger.warn('AUDIT', `Tu README podría mejorar (Score: ${this.results.audit.score})`);
            }

            // Fase 5: Procesamiento de workers en background
            this.startWorkerProcessing(onStep);

            // Fase 6: Análisis en segundo plano (Descargas y Cache)
            this.backgroundPromise = this.backgroundAnalyzer.startBackgroundAnalysis(username, allFindings, (data) => {
                if (data.type === 'Progreso') {
                    // Si el background analyzer termina de descargar algo,
                    // el WorkerPool lo pescará automáticamente en el próximo getNextItem.
                }
                if (onStep) onStep(data);
            });

            // Fase 7: Inteligencia Incremental (Pulse Curation)
            // Ejecutamos una curación final al terminar todo
            this.fullIntelligencePromise = (async () => {
                // Esperar a que el background analyzer (descagas) y los workers terminen
                await Promise.all([
                    this.backgroundPromise,
                    this.aiWorkersPromise || Promise.resolve()
                ]);

                Logger.dna('Ejecutando SÍNTESIS FINAL del Curador...');
                const newCuration = await this.deepCurator.runDeepCurator(username, this.coordinator);

                // --- DIGESTIÓN METABÓLICA (Nuevo Agente) ---
                const oldDNA = await CacheRepository.getDeveloperDNA(username);
                const { finalDNA, report, isSignificant } = this.metabolicAgent.digest(oldDNA, newCuration);

                // --- PERSISTENCIA DEL ADN ---
                await CacheRepository.setDeveloperDNA(username, finalDNA);
                Logger.success('ANALYZER', '🧬 ADN del Programador actualizado y digerido.');

                // Actualizar contexto final en el Chat
                const freshContext = this.getFreshContext(username, finalDNA);
                AIService.setSessionContext(freshContext);

                // Solo si el cambio es significativo, disparamos una reacción REACTIVA
                if (isSignificant && report.milestone !== 'INITIAL_SYNTHESIS') {
                    const metabolicPrompt = this.metabolicAgent.generateMetabolicPrompt(report, username);
                    setTimeout(async () => {
                        const response = await AIService.processIntent(metabolicPrompt, username);
                        const { ChatComponent } = await import('../components/chatComponent.js');
                        ChatComponent.addMessage(response.message, 'ai');
                    }, 2000);
                }

                if (onStep) {
                    onStep({
                        type: 'DeepMemoryReady',
                        message: isSignificant ? '🧠 ¡Tu ADN ha evolucionado!' : '🧠 Memoria sincronizada.',
                        data: finalDNA
                    });
                }

                return finalDNA;
            })();

            return this.results;

        } catch (error) {
            console.error("❌ Error en el análisis agéntico paralelo:", error);
            return null;
        } finally {
            this.isAnalyzing = false;
        }
    }

    async runAuditorAgent(username) {
        try {
            const { ToolRegistry } = await import('./toolRegistry.js');
            const auditor = ToolRegistry.getById('readability_auditor');
            if (auditor) {
                return await auditor.execute({}, username);
            }
        } catch (e) {
            return { score: 0, details: "Auditor offline" };
        }
    }

    /**
     * Procesa archivos con workers de IA en background
     */
    startWorkerProcessing(onStep) {
        if (this.workerPool.totalQueued > 0) {
            Logger.info('AI WORKERS', `Lanzando ${this.workerPool.workerCount} workers en background para ${this.workerPool.totalQueued} archivos...`);

            this.workerPool.onProgress = (data) => {
                if (onStep) {
                    onStep({
                        type: 'Progreso',
                        percent: data.percent,
                        message: `🤖 Worker ${data.workerId}: ${data.file}`
                    });
                }
            };

            this.aiWorkersPromise = this.workerPool.processAll(AIService).then(aiSummaries => {
                Logger.success('AI WORKERS', `Background complete: ${aiSummaries.length} archivos resumidos`);
            }).catch(err => {
                console.warn('[AI WORKERS] Background error:', err);
            });
        }
    }

    processLanguages(repos) {
        const counts = {};
        repos.forEach(r => {
            if (r.language) {
                counts[r.language] = (counts[r.language] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0]);
    }

    /**
     * Obtiene el contexto más reciente incluyendo todos los resúmenes de archivos
     * Se debe llamar después de que el background analysis o los workers terminen.
     */
    getFreshContext(username, deepMemory) {
        if (!this.results) return "";

        const langList = (this.results.mainLangs && this.results.mainLangs.length > 0)
            ? this.results.mainLangs.join(', ')
            : 'varios lenguajes';

        const quickSummaries = this.coordinator.getSummaryForChat();

        let deepMemoryString = "";
        if (typeof deepMemory === 'object' && deepMemory !== null) {
            deepMemoryString = `BIOGRAFÍA: ${deepMemory.bio}\n`;
            deepMemoryString += `VEREDICTO: ${deepMemory.verdict}\n`;
            if (Array.isArray(deepMemory.traits)) {
                deepMemoryString += "RASGOS DETECTADOS:\n";
                deepMemory.traits.forEach(t => {
                    deepMemoryString += `- [${t.name} ${t.score}%]: ${t.details}\n`;
                });
            }
        } else {
            deepMemoryString = deepMemory || "Generando síntesis profunda... usa los resúmenes rápidos por ahora.";
        }

        return `# 🧠 MEMORIA PROFUNDA: DIRECTOR DE ARTE
**USUARIO**: ${username}
**STACK DETECTADO**: ${langList}

## 📄 RESUMEN BIOGRÁFICO (CURADO)
${this.results.summary || "Sintetizando perfil..."}

## 🧬 ADN TÉCNICO (SÍNTESIS MAP-REDUCE 100%)
> [!NOTE]
> Esta sección representa el conocimiento profundo extraído de todos tus repositorios.
${deepMemoryString}

## 🔍 EVIDENCIAS TÉCNICAS RECIENTES (DETALLE POR REPO)
${quickSummaries || "Espere por favor, analizando repositorios..."}

---
**FIN DEL CONTEXTO DE INTELIGENCIA**`;
    }
}
