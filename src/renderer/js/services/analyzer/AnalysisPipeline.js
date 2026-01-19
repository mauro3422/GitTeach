/**
 * AnalysisPipeline - Orchestrates the analysis flow and final synthesis
 * Extracted from ProfileAnalyzer to comply with SRP
 *
 * SOLID Principles:
 * - S: Only orchestrates analysis pipeline and synthesis
 * - O: Extensible analysis steps
 * - L: N/A
 * - I: Clean interface for analysis orchestration
 * - D: Depends on injected components (scanner, curator, etc.)
 */

import { AIService } from '../aiService.js';
import { FlowManager } from './FlowManager.js';
import { ReactionEngine } from './ReactionEngine.js';
import { memoryManager } from '../memory/MemoryManager.js';
import { Logger } from '../../utils/logger.js';
import { CacheRepository } from '../../utils/cacheRepository.js';

export class AnalysisPipeline {
    constructor() {
        this.results = FlowManager.getInitialResults();
        this.isAnalyzing = false;
    }

    /**
     * Main analysis orchestration
     */
    async analyze(username, coordinator, codeScanner, deepCurator, intelligenceSynthesizer, options = {}, onStep = null, workerPool = null) {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        let repos = [];

        try {
            const cachedIdentity = await CacheRepository.getTechnicalIdentity(username);
            const cachedFindings = await CacheRepository.getTechnicalFindings(username);
            const savedProfile = await intelligenceSynthesizer.loadFromDisk(username);

            AIService.setSessionContext(this.getFreshContext(username, cachedIdentity, savedProfile, cachedFindings));

            if (onStep) onStep({ type: 'Status', message: `🚀 Initializing ${options.maxRepos || 10} repos analysis (Up to ${options.maxAnchors || 10} files/repo)` });

            const githubAPI = options.githubAPI || (typeof window !== 'undefined' ? window.githubAPI : null);

            let audit = null;
            const response = await Promise.all([
                githubAPI ? githubAPI.listRepos() : Promise.resolve([]),
                this.runAuditorAgent(username)
            ]);

            const maxRepos = options.maxRepos || 10;
            repos = (response[0] || []).slice(0, maxRepos);
            audit = response[1];

            // 1. ACTIVATE WORKERS EARLY (Parallelism Engine)
            if (workerPool) {
                Logger.info('ANALYZER', '🚀 Activating AI Worker Pool (Parallel Mode)...');
                workerPool.processQueue(AIService).catch(err => {
                    Logger.error('ANALYZER', `Worker Pool Crash: ${err.message}`);
                });
            }

            // STREAMING ARCHITECTURE: Bridge Coordinator -> DeepCurator
            coordinator.onRepoComplete = (repoName) => {
                deepCurator.processStreamingRepo(username, repoName, coordinator);
            };

            // PARTIAL STREAMING: Update every 3 files
            coordinator.onRepoBatchReady = (repoName) => {
                deepCurator.processStreamingRepo(username, repoName, coordinator, true);
            };

            let codeInsights = [];
            let allFindings = [];
            if (typeof window !== 'undefined' && !window.AI_OFFLINE) {
                // Pass options to scanner for strict 10x10 capping
                allFindings = await codeScanner.scan(username, repos, onStep, options);
                codeInsights = codeScanner.curateFindings(allFindings);
            }

            const langData = FlowManager.processLanguages(repos);
            let aiInsight = { summary: "IA Offline.", suggestions: [] };
            if (typeof window !== 'undefined' && !window.AI_OFFLINE) {
                aiInsight = await deepCurator.getAIInsights(username, langData, codeInsights, codeInsights.length > 0);
            }

            this.results = FlowManager.finalizeResults(username, repos, aiInsight, langData, codeInsights, coordinator);
            this.results.audit = audit;

            // UNIFIED QUEUE: Processing background files via CodeScanner (Low Priority)
            this.backgroundPromise = codeScanner.processBackgroundFiles(username, allFindings).then(() => {
                if (workerPool?.queueManager) {
                    workerPool.queueManager.setEnqueueingComplete();
                }
            });

            // Await workers completion promise
            this.aiWorkersPromise = workerPool?.waitForCompletion ? workerPool.waitForCompletion() : Promise.resolve();

            this.fullIntelligencePromise = this.runFinalSynthesis(username, coordinator, deepCurator, intelligenceSynthesizer, savedProfile);

            // SYNC FIX: Await the full synthesis before returning results
            // This ensures TracerView doesn't generate summary prematurely
            await this.fullIntelligencePromise;

            return this.results;
        } catch (error) {
            console.error("❌ Analysis Error:", error);
            const langData = FlowManager.processLanguages(repos || []);
            this.results = FlowManager.finalizeResults(username, repos || [], { summary: "Error parcial durante el escaneo." }, langData, [], coordinator);
            return this.results;
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * Run final synthesis strategy
     */
    async runFinalSynthesis(username, coordinator, deepCurator, intelligenceSynthesizer, savedProfile) {
        try {
            await Promise.all([this.backgroundPromise, this.aiWorkersPromise || Promise.resolve()]);

            // GRACEFUL DRAIN: Mark enqueueing as complete so workers know to stop waiting
            // coordinator.workerPool?.queueManager?.setEnqueueingComplete();

            // SAFETY NET: If WorkerPool failed to populate StreamingHandler, pull from Coordinator
            const currentFindings = deepCurator.streamingHandler.getAccumulatedFindings();
            const coordinatorCount = coordinator.getAllRichSummaries().length;

            if (currentFindings.length < coordinatorCount * 0.8) { // Threshold: 80% coverage
                const coordinatorFindings = coordinator.getAllRichSummaries();
                if (coordinatorFindings.length > 0) {
                    console.warn(`[AnalysisPipeline] ⚠️ SYNC GAP DETECTED: Coordinator(${coordinatorCount}) vs Tracer(${currentFindings.length}). Resurrecting findings.`);

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

                    deepCurator.incorporateBatch(resurrected);
                }
            } else {
                Logger.info('ANALYZER', `✅ Sync Integrity: ${currentFindings.length}/${coordinatorCount} findings processed.`);
            }

            // PERSISTENCE V3: Flush all repo memories before synthesis strategy
            await memoryManager.persistAll();

            Logger.reducer('Executing FINAL SYNTHESIS...');
            const curationResult = await deepCurator.runDeepCurator(username, coordinator);
            if (!curationResult || curationResult.error) {
                Logger.error('ANALYZER', `Synthesis failed: ${curationResult?.error || 'No result'}`);
                return null;
            }

            // 1. Save Technical Identity (DNA) - High-fidelity structured data
            await CacheRepository.setTechnicalIdentity(username, curationResult.dna);

            // 2. Synthesize/Evolve Cognitive Profile (Persona) from the DNA
            const { finalProfile, report, isSignificant } = await intelligenceSynthesizer.synthesizeProfile(savedProfile, curationResult.dna);

            // Forensics: Attach performance metrics
            finalProfile.performance = curationResult.performance;

            // 3. Save Cognitive Profile (Narrative/Portrait)
            await intelligenceSynthesizer.saveToDisk();

            Logger.debug('ANALYZER', `### TRACEABILITY MAP:\n${Array.isArray(curationResult.traceability_map) ? curationResult.traceability_map.join('\n') : ''}`);
            if (curationResult.traceability_map) {
                await CacheRepository.setTechnicalFindings(username, curationResult.traceability_map);
            }

            // Inyectar contexto: Identidad Técnica (Personalidad) + ADN (Trazabilidad) + Memoria (Hallazgos)
            AIService.setSessionContext(this.getFreshContext(username, finalProfile, intelligenceSynthesizer.technicalProfile, curationResult.traceability_map));

            if (isSignificant && report.milestone !== 'INITIAL_SYNTHESIS') {
                const reactiveMsg = `DNA_EVOLUTION_DETECTED: ${report.evolutionSnapshot || 'Nuevos rasgos detectados.'}`;
                ReactionEngine.trigger(username, reactiveMsg, 'system');
            }

            return finalProfile;
        } catch (error) {
            console.error("❌ Final Synthesis Error:", error);
            Logger.error('ANALYZER', `Final synthesis failed: ${error.message}`);
            return null;
        }
    }

    async runAuditorAgent(username) {
        try {
            const { ToolRegistry } = await import('../toolRegistry.js');
            const auditor = ToolRegistry.getById('readability_auditor');
            return auditor ? await auditor.execute({}, username) : { score: 0 };
        } catch (e) { return { score: 0 }; }
    }

    getFreshContext(username, technicalIdentity, cognitiveProfile = null, curationEvidence = null) {
        return {
            username,
            technicalIdentity,
            cognitiveProfile,
            curationEvidence,
            coordinatorSummary: null // Would need coordinator injection
        };
    }

    getResults() {
        return this.results;
    }
}
