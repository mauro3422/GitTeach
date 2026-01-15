/**
 * ProfileAnalyzer - Orquestador de agentes en paralelo para analizar el perfil de GitHub
 * REFACTORED: Ahora delega a módulos especializados (SRP compliant)
 * 
 * Módulos:
 * - CodeScanner: Escaneo de repositorios y archivos
 * - DeepCurator: Curación Map-Reduce y AI Insights
 * - BackgroundAnalyzer: Análisis en segundo plano
 * - ContextBuilder: Construcción del contexto de sesión
 */
import { AIService } from './aiService.js';
import { CoordinatorAgent } from './coordinatorAgent.js';
import { AIWorkerPool } from './aiWorkerPool.js';
import { CodeScanner } from './codeScanner.js';
import { DeepCurator } from './deepCurator.js';
import { BackgroundAnalyzer } from './backgroundAnalyzer.js';
import { IntelligenceSynthesizer } from './intelligenceSynthesizer.js';
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { DebugLogger } from '../utils/debugLogger.js';
import { ContextBuilder } from './analyzer/ContextBuilder.js';

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
        this.workerPool = new AIWorkerPool(3, this.coordinator, debugLogger);

        // Specialized modules
        this.codeScanner = new CodeScanner(this.coordinator, this.workerPool);
        this.deepCurator = new DeepCurator();
        this.intelligenceSynthesizer = new IntelligenceSynthesizer(null, debugLogger);
        // INJECT: Pass debugLogger to BackgroundAnalyzer to capture its "workers"
        this.backgroundAnalyzer = new BackgroundAnalyzer(this.coordinator, this.deepCurator, debugLogger);
    }

    async analyze(username, onStep = null) {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        try {
            // Get cached Technical Identity if exists
            const cachedIdentity = await CacheRepository.getTechnicalIdentity(username);
            const cachedFindings = await CacheRepository.getTechnicalFindings(username);

            // Load Cognitive Profile from disk (if exists) - this is the "master memory"
            const savedProfile = await this.intelligenceSynthesizer.loadFromDisk(username);
            if (savedProfile) {
                Logger.success('ANALYZER', `Loaded previous Cognitive Profile: ${savedProfile.title}`);
            }

            // Inject initial context with cached findings if they exist
            AIService.setSessionContext(this.getFreshContext(username, cachedIdentity, savedProfile, cachedFindings));
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
            AIService.setSessionContext(this.getFreshContext(username, cachedIdentity, savedProfile, cachedFindings));

            if (this.results.audit && this.results.audit.score < 50) {
                Logger.warn('AUDIT', `Tu README podría mejorar (Score: ${this.results.audit.score})`);
            }

            // Fase 5: Procesamiento de workers en background
            this.startWorkerProcessing(onStep, username);

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

                Logger.reducer('Ejecutando SÍNTESIS FINAL del Curador...');
                const curationResult = await this.deepCurator.runDeepCurator(username, this.coordinator);

                if (!curationResult) return null;

                const { dna: newIdentity, traceability_map: freshMap } = curationResult;

                // --- SÍNTESIS DE INTELIGENCIA ---
                const oldIdentity = await CacheRepository.getTechnicalIdentity(username);
                const { finalProfile: processedIdentity, report, isSignificant } = await this.intelligenceSynthesizer.synthesizeProfile(oldIdentity, newIdentity);

                // --- PERSISTENCIA DE LA IDENTIDAD TÉCNICA ---
                await CacheRepository.setTechnicalIdentity(username, processedIdentity);

                // --- PERSISTENCIA DE EVIDENCIAS TÉCNICAS (Mapa de Trazabilidad) ---
                if (freshMap) {
                    await CacheRepository.setTechnicalFindings(username, freshMap);
                }

                Logger.success('ANALYZER', '🧬 Identidad Técnica y Evidencias actualizadas de forma persistente.');

                // Actualizar contexto final en el Chat
                const freshContext = this.getFreshContext(username, processedIdentity, this.intelligenceSynthesizer.technicalProfile, freshMap);
                AIService.setSessionContext(freshContext);

                // Solo si el cambio es significativo, disparamos una reacción REACTIVA
                if (isSignificant && report.milestone !== 'INITIAL_SYNTHESIS') {
                    const reactivePrompt = this.intelligenceSynthesizer.generateReactivePrompt(report, username);
                    setTimeout(async () => {
                        try {
                            DebugLogger.logChat('system', reactivePrompt); // Log trigger
                            const response = await AIService.processIntent(reactivePrompt, username);

                            // Try to update UI if possible
                            try {
                                const { ChatComponent } = await import('../components/chatComponent.js');
                                ChatComponent.addMessage(response.message, 'ai');
                            } catch (uiError) {
                                console.warn("Could not load ChatComponent (Headless mode?)", uiError);
                            }

                            DebugLogger.logChat('ai', response.message); // Log response
                        } catch (err) {
                            console.error("Error in Reactive Prompt Flow:", err);
                        }
                    }, 2000);
                }

                if (onStep) {
                    onStep({
                        type: 'DeepMemoryReady',
                        message: isSignificant ? '🧠 ¡Tu identidad técnica ha evolucionado!' : '🧠 Memoria sincronizada.',
                        data: processedIdentity
                    });
                }

                return processedIdentity;
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
    startWorkerProcessing(onStep, username) {
        if (this.workerPool.totalQueued > 0) {
            Logger.info('AI WORKERS', `Lanzando ${this.workerPool.workerCount} workers en background para ${this.workerPool.totalQueued} archivos...`);

            this.workerPool.onProgress = (data) => {
                if (onStep) {
                    onStep({
                        type: 'Progreso',
                        percent: data.percent,
                        message: `🤖 Worker ${data.workerId}: ${data.file.split(/[/\\]/).pop()} (Processed)`
                    });
                }
            };

            // NEW: Streaming Map-Reduce Wiring
            this.workerPool.onBatchComplete = (batch) => {
                Logger.info('ANALYZER', `🔄 Streaming Batch: ${batch.length} files -> DeepCurator`);

                // 1. Incorporate into Memory Agent (DeepCurator)
                const stats = this.deepCurator.incorporateBatch(batch);

                // 2. Check for Evolution Impulse (IntelligenceSynthesizer)
                const reflection = this.intelligenceSynthesizer.synthesizeBatch(stats);

                if (reflection.isSignificant) {
                    Logger.success('ANALYZER', `💡 Intermediate Evolution: ${reflection.snapshot}`);
                    if (onStep) {
                        onStep({
                            type: 'DeepMemoryReady', // Re-using this event type for UI compatibility
                            message: `🧠 ${reflection.snapshot}`,
                            data: null // Incremental update doesn't replace full profile yet
                        });
                    }

                    // 3. Trigger Reactive Chat Bubble (Autonomous Reaction)
                    if (username) {
                        const reactivePrompt = `SYSTEM_EVENT: ${reflection.snapshot}`;
                        setTimeout(async () => {
                            try {
                                DebugLogger.logChat('system', reactivePrompt);

                                // Ask AI to react to the system event
                                const response = await AIService.processIntent(reactivePrompt, username);

                                // Update UI
                                try {
                                    const { ChatComponent } = await import('../components/chatComponent.js');
                                    ChatComponent.addMessage(response.message, 'ai');
                                } catch (uiError) {
                                    // Headless/Test mode - ignore UI update
                                }

                                DebugLogger.logChat('ai', response.message);
                            } catch (err) {
                                console.error("Error in Streaming Chat Reaction:", err);
                            }
                        }, 500);
                    }
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
     * Delegado a ContextBuilder module.
     */
    getFreshContext(username, technicalIdentity, cognitiveProfile = null, curationEvidence = null) {
        return ContextBuilder.build(
            username,
            this.results,
            technicalIdentity,
            cognitiveProfile,
            curationEvidence,
            () => this.coordinator.getSummaryForChat()
        );
    }
}
