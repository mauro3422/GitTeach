/**
 * ProfileAnalyzer - Orchestrates specialized modules for user analysis (Facade).
 */
import { AIService } from './aiService.js';
import { CoordinatorAgent } from './coordinatorAgent.js';
import { AIWorkerPool } from './aiWorkerPool.js';
import { CodeScanner } from './codeScanner.js';
import { DeepCurator } from './deepCurator.js';
import { IntelligenceSynthesizer } from './intelligenceSynthesizer.js';
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { ContextBuilder } from './analyzer/ContextBuilder.js';
import { FlowManager } from './analyzer/FlowManager.js';
import { ReactionEngine } from './analyzer/ReactionEngine.js';
import { memoryManager } from './memory/MemoryManager.js';

console.log("!!! PROFILE ANALYZER RELOADED - VERSION RESURRECTION !!!");

export class ProfileAnalyzer {
    constructor(debugLogger = null, options = {}) {
        this.results = FlowManager.getInitialResults();
        this.isAnalyzing = false;
        this.debugLogger = debugLogger;
        this.options = options;

        this.coordinator = new CoordinatorAgent();
        this.workerPool = new AIWorkerPool(3, this.coordinator, debugLogger);
        this.codeScanner = new CodeScanner(this.coordinator, this.workerPool);
        this.deepCurator = new DeepCurator();
        this.intelligenceSynthesizer = new IntelligenceSynthesizer(null, debugLogger);
    }

    async analyze(username, onStep = null) {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        let repos = []; // Initialize repos here

        try {
            const cachedIdentity = await CacheRepository.getTechnicalIdentity(username);
            const cachedFindings = await CacheRepository.getTechnicalFindings(username);
            const savedProfile = await this.intelligenceSynthesizer.loadFromDisk(username);

            AIService.setSessionContext(this.getFreshContext(username, cachedIdentity, savedProfile, cachedFindings));

            console.log(`[ProfileAnalyzer] ENV CHECK: window=${typeof window}, githubAPI=${typeof window !== 'undefined' ? !!window.githubAPI : 'N/A'}`);

            const githubAPI = this.options.githubAPI || (typeof window !== 'undefined' ? window.githubAPI : null);

            let audit = null;
            const response = await Promise.all([
                githubAPI ? githubAPI.listRepos() : Promise.resolve([]),
                this.runAuditorAgent(username)
            ]);

            repos = response[0];
            audit = response[1];

            // STREAMING ARCHITECTURE: Bridge Coordinator -> DeepCurator
            // MUST be set BEFORE scan() to catch cached repos that complete immediately
            this.coordinator.onRepoComplete = (repoName) => {
                this.deepCurator.processStreamingRepo(username, repoName, this.coordinator);
                if (onStep) onStep({ type: 'StreamingUpdate', message: `⚡ Streaming Blueprint: ${repoName} (Final)` });
            };

            // PARTIAL STREAMING: Update every 3 files
            this.coordinator.onRepoBatchReady = (repoName) => {
                this.deepCurator.processStreamingRepo(username, repoName, this.coordinator, true); // true = partial
                if (onStep) onStep({ type: 'StreamingUpdate', message: `🌊 Partial Update: ${repoName}` });
            };

            let codeInsights = [];
            let allFindings = [];
            if (typeof window !== 'undefined' && !window.AI_OFFLINE) {
                allFindings = await this.codeScanner.scan(username, repos, onStep);
                codeInsights = this.codeScanner.curateFindings(allFindings);
            }

            const langData = FlowManager.processLanguages(repos);
            let aiInsight = { summary: "IA Offline.", suggestions: [] };
            if (typeof window !== 'undefined' && !window.AI_OFFLINE) {
                aiInsight = await this.deepCurator.getAIInsights(username, langData, codeInsights, codeInsights.length > 0);
            }

            this.results = FlowManager.finalizeResults(username, repos, aiInsight, langData, codeInsights, this.coordinator);
            this.results.audit = audit;

            this.startWorkerProcessing(onStep, username);

            // UNIFIED QUEUE: Processing background files via CodeScanner (Low Priority)
            this.backgroundPromise = this.codeScanner.processBackgroundFiles(username, allFindings, (data) => {
                if (onStep) onStep(data);
            });

            this.fullIntelligencePromise = this._runFinalSynthesis(username, onStep);

            return this.results;
        } catch (error) {
            console.error("❌ Analysis Error:", error);
            // Even if scanning fails, try to finalize with what we have
            const langData = FlowManager.processLanguages(repos || []);
            this.results = FlowManager.finalizeResults(username, repos || [], { summary: "Error parcial durante el escaneo." }, langData, [], this.coordinator);
            return this.results;
        } finally {
            this.isAnalyzing = false;
        }
    }

    async _runFinalSynthesis(username, onStep) {
        try {
            await Promise.all([this.backgroundPromise, this.aiWorkersPromise || Promise.resolve()]);

            // GRACEFUL DRAIN: Mark enqueueing as complete so workers know to stop waiting
            this.workerPool.queueManager.setEnqueueingComplete();

            // SAFETY NET: If WorkerPool failed to populate StreamingHandler, pull from Coordinator
            // This covers the case where workers died early or queue ingestion was silent
            const currentFindings = this.deepCurator.streamingHandler.getAccumulatedFindings();
            const coordinatorCount = this.coordinator.getAllRichSummaries().length;

            if (currentFindings.length < coordinatorCount * 0.8) { // Threshold: 80% coverage
                const coordinatorFindings = this.coordinator.getAllRichSummaries();
                if (coordinatorFindings.length > 0) {
                    console.warn(`[ProfileAnalyzer] ⚠️ SYNC GAP DETECTED: Coordinator(${coordinatorCount}) vs Tracer(${currentFindings.length}). Resurrecting findings.`);

                    const resurrected = coordinatorFindings.map(f => ({
                        repo: f.repo,
                        path: f.path,
                        file: f.path || 'unknown',
                        summary: f.params?.insight || f.summary || `Content analyzed (Coordinator Fallback)`,
                        workerId: 'fallback',
                        classification: f.classification || 'General',
                        uid: f.uid || Math.random().toString(36).substring(7),
                        file_meta: f.file_meta || {},
                        metadata: f.metadata || (f.params?.metadata ? f.params.metadata : {}),
                        params: f.params || { metadata: f.metadata || {} }
                    }));

                    this.deepCurator.incorporateBatch(resurrected);
                }
            } else {
                Logger.info('ANALYZER', `✅ Sync Integrity: ${currentFindings.length}/${coordinatorCount} findings processed.`);
            }

            // PERSISTENCE V3: Flush all repo memories before synthesis strategy
            await memoryManager.persistAll();

            Logger.reducer('Executing FINAL SYNTHESIS...');
            const curationResult = await this.deepCurator.runDeepCurator(username, this.coordinator);
            if (!curationResult || curationResult.error) {
                Logger.error('ANALYZER', `Synthesis failed: ${curationResult?.error || 'No result'}`);
                return null;
            }

            // 1. Save Technical Identity (DNA) - High-fidelity structured data
            await CacheRepository.setTechnicalIdentity(username, curationResult.dna);

            // 2. Synthesize/Evolve Cognitive Profile (Persona) from the DNA
            // Use savedProfile (from line 42) which is the Cognitive Profile
            const { finalProfile, report, isSignificant } = await this.intelligenceSynthesizer.synthesizeProfile(savedProfile, curationResult.dna);

            // Forensics: Attach performance metrics
            finalProfile.performance = curationResult.performance;

            // 3. Save Cognitive Profile (Narrative/Portrait)
            await this.intelligenceSynthesizer.saveToDisk();

            Logger.debug('ANALYZER', `### TRACEABILITY MAP:\n${Array.isArray(curationResult.traceability_map) ? curationResult.traceability_map.join('\n') : ''}`);
            if (curationResult.traceability_map) {
                await CacheRepository.setTechnicalFindings(username, curationResult.traceability_map);
            }

            // Inyectar contexto: Identidad Técnica (Personalidad) + ADN (Trazabilidad) + Memoria (Hallazgos)
            AIService.setSessionContext(this.getFreshContext(username, finalProfile, this.intelligenceSynthesizer.technicalProfile, curationResult.traceability_map));

            if (isSignificant && report.milestone !== 'INITIAL_SYNTHESIS') {
                const reactiveMsg = `DNA_EVOLUTION_DETECTED: ${report.evolutionSnapshot || 'Nuevos rasgos detectados.'}`;
                ReactionEngine.trigger(username, reactiveMsg, 'system');
            }

            if (onStep) onStep({ type: 'DeepMemoryReady', message: isSignificant ? '🧠 Identidad Evolucionada!' : '🧠 Memoria sincronizada.', data: finalProfile });
            return finalProfile;
        } catch (error) {
            console.error("❌ Final Synthesis Error:", error);
            Logger.error('ANALYZER', `Final synthesis failed: ${error.message}`);
            return null;
        }
    }

    async runAuditorAgent(username) {
        try {
            const { ToolRegistry } = await import('./toolRegistry.js');
            const auditor = ToolRegistry.getById('readability_auditor');
            return auditor ? await auditor.execute({}, username) : { score: 0 };
        } catch (e) { return { score: 0 }; }
    }

    async startWorkerProcessing(onStep, username) {
        // if (this.workerPool.totalQueued === 0) return; // REMOVED: Listener must attach regardless of initial state (Race Condition Fix)

        this.workerPool.onProgress = (data) => {
            if (onStep) onStep({ type: 'Progreso', percent: data.percent, message: `🤖 Worker ${data.workerId}: Processed` });
        };
        console.log("ProfileAnalyzer: Listener Attached (onBatchComplete)");
        // Listen for batch completion (Concurrent)
        // This receives the batch from AIWorkerPool -> WorkerHealthMonitor
        this.workerPool.onBatchComplete = async (batch) => {
            console.log(`ProfileAnalyzer: onBatchComplete RECV batch=${batch ? batch.length : 'null'}`);
            // EMERGENCY FIX: Reconstruct objects to ensure validity (Ghost Object Protocol)
            // We create FRESH objects to bypass any immutability or reference issues
            // EMERGENCY FIX: Reconstruct objects force-breaking references (Deep Clone)
            // We create FRESH objects to bypass any immutability or reference issues
            const fixedBatch = batch.map(f => {
                const safePath = f.path || f.file || 'unknown';
                const safeSummary = f.summary || (f.content ? `Analyzed content (${f.content.length} chars)` : "No Summary Available (Resurrected)");

                return {
                    repo: f.repo,
                    path: safePath,
                    file: safePath,
                    summary: safeSummary,
                    workerId: f.workerId || 999,
                    classification: f.classification || 'General',
                    uid: f.uid,
                    file_meta: f.file_meta || {},
                    metadata: f.metadata || {},
                    params: f.params || {}
                };
            });

            // Log first item to verify resurrection
            if (fixedBatch.length > 0) {
                console.log(`[ProfileAnalyzer] Resurrected Batch: Size=${fixedBatch.length}, Item0 Summary=${!!fixedBatch[0].summary}, Path=${fixedBatch[0].path}`);
                // console.log("DUMP:", JSON.stringify(fixedBatch[0]));
            }

            // CRITICAL: Pass to Curator FIRST to avoid any mutation by MemoryManager
            const stats = this.deepCurator.incorporateBatch(fixedBatch);

            // Persist to Graph Memory (Async)
            // Use for...of to ensure we await the async storeFinding
            for (const finding of fixedBatch) {
                const node = await memoryManager.storeFinding(finding);
                // Attach the UID to the finding for later curation linking
                finding.uid = node.uid;
            }

            const reflection = this.intelligenceSynthesizer.synthesizeBatch(stats);
            if (reflection.isSignificant) {
                Logger.success('ANALYZER', `💡 Intermediate Evolution: ${reflection.snapshot}`);
                if (onStep) onStep({ type: 'DeepMemoryReady', message: `🧠 ${reflection.snapshot}`, data: null });

                ReactionEngine.trigger(username, reflection.snapshot, 'system');
            }

            // TELEMETRY: Trace total findings count vs coordinator
            const totalInCurator = this.deepCurator.streamingHandler.getAccumulatedFindings().length;
            const totalInCoord = this.coordinator.getAllRichSummaries().length;
            console.log(`[ProfileAnalyzer] Sync Status: Tracer(${totalInCurator}) | Coord(${totalInCoord})`);

            // NOTIFY EXTERNAL LISTENERS (Tracer, UI, etc)
            if (this.onBatchComplete && typeof this.onBatchComplete === 'function') {
                await this.onBatchComplete(fixedBatch);
            }
        };

        this.aiWorkersPromise = this.workerPool.processQueue(AIService).catch(err => console.warn('[AI WORKERS] Error:', err));
    }

    getFreshContext(username, technicalIdentity, cognitiveProfile = null, curationEvidence = null) {
        return ContextBuilder.build(username, this.results, technicalIdentity, cognitiveProfile, curationEvidence, () => this.coordinator.getSummaryForChat());
    }
}
