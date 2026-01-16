/**
 * ProfileAnalyzer - Orchestrates specialized modules for user analysis (Facade).
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
import { ContextBuilder } from './analyzer/ContextBuilder.js';
import { FlowManager } from './analyzer/FlowManager.js';
import { ReactionEngine } from './analyzer/ReactionEngine.js';
import { memoryManager } from './memory/MemoryManager.js';

export class ProfileAnalyzer {
    constructor(debugLogger = null) {
        this.results = FlowManager.getInitialResults();
        this.isAnalyzing = false;
        this.debugLogger = debugLogger;

        this.coordinator = new CoordinatorAgent();
        this.workerPool = new AIWorkerPool(3, this.coordinator, debugLogger);
        this.codeScanner = new CodeScanner(this.coordinator, this.workerPool);
        this.deepCurator = new DeepCurator();
        this.intelligenceSynthesizer = new IntelligenceSynthesizer(null, debugLogger);
        this.backgroundAnalyzer = new BackgroundAnalyzer(this.coordinator, this.deepCurator, debugLogger);
    }

    async analyze(username, onStep = null) {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        try {
            const cachedIdentity = await CacheRepository.getTechnicalIdentity(username);
            const cachedFindings = await CacheRepository.getTechnicalFindings(username);
            const savedProfile = await this.intelligenceSynthesizer.loadFromDisk(username);

            AIService.setSessionContext(this.getFreshContext(username, cachedIdentity, savedProfile, cachedFindings));

            const [repos, audit] = await Promise.all([
                (typeof window !== 'undefined' && window.githubAPI) ? window.githubAPI.listRepos() : Promise.resolve([]),
                this.runAuditorAgent(username)
            ]);

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

            this.backgroundPromise = this.backgroundAnalyzer.startBackgroundAnalysis(username, allFindings, (data) => {
                if (onStep) onStep(data);
            });

            this.fullIntelligencePromise = this._runFinalSynthesis(username, onStep);

            return this.results;
        } catch (error) {
            console.error("❌ Analysis Error:", error);
            return null;
        } finally {
            this.isAnalyzing = false;
        }
    }

    async _runFinalSynthesis(username, onStep) {
        await Promise.all([this.backgroundPromise, this.aiWorkersPromise || Promise.resolve()]);

        Logger.reducer('Executing FINAL SYNTHESIS...');
        const curationResult = await this.deepCurator.runDeepCurator(username, this.coordinator);
        if (!curationResult) return null;

        const oldIdentity = await CacheRepository.getTechnicalIdentity(username);
        const { finalProfile, report, isSignificant } = await this.intelligenceSynthesizer.synthesizeProfile(oldIdentity, curationResult.dna);

        await CacheRepository.setTechnicalIdentity(username, finalProfile);
        if (curationResult.traceability_map) {
            await CacheRepository.setTechnicalFindings(username, curationResult.traceability_map);
        }

        AIService.setSessionContext(this.getFreshContext(username, finalProfile, this.intelligenceSynthesizer.technicalProfile, curationResult.traceability_map));

        if (isSignificant && report.milestone !== 'INITIAL_SYNTHESIS') {
            const reactivePrompt = `Mi identidad técnica ha evolucionado: ${report.evolutionSnapshot || 'Nuevos hallazgos detectados.'}`;
            ReactionEngine.trigger(username, reactivePrompt, 'raw');
        }

        if (onStep) onStep({ type: 'DeepMemoryReady', message: isSignificant ? '🧠 Identidad Evolucionada!' : '🧠 Memoria sincronizada.', data: finalProfile });
        return finalProfile;
    }

    async runAuditorAgent(username) {
        try {
            const { ToolRegistry } = await import('./toolRegistry.js');
            const auditor = ToolRegistry.getById('readability_auditor');
            return auditor ? await auditor.execute({}, username) : { score: 0 };
        } catch (e) { return { score: 0 }; }
    }

    startWorkerProcessing(onStep, username) {
        if (this.workerPool.totalQueued === 0) return;

        this.workerPool.onProgress = (data) => {
            if (onStep) onStep({ type: 'Progreso', percent: data.percent, message: `🤖 Worker ${data.workerId}: Processed` });
        };

        this.workerPool.onBatchComplete = (batch) => {
            // Memory V3: Store findings in the decoupled MemoryManager
            batch.forEach(finding => {
                const node = memoryManager.storeFinding(finding);
                // Attach the UID to the finding for later curation linking
                finding.uid = node.uid;
                // Fix: InsightsCurator expects 'file', AIWorkerPool provides 'path'
                finding.file = finding.path;
            });

            const stats = this.deepCurator.incorporateBatch(batch);
            const reflection = this.intelligenceSynthesizer.synthesizeBatch(stats);
            if (reflection.isSignificant) {
                Logger.success('ANALYZER', `💡 Intermediate Evolution: ${reflection.snapshot}`);
                if (onStep) onStep({ type: 'DeepMemoryReady', message: `🧠 ${reflection.snapshot}`, data: null });
                ReactionEngine.trigger(username, reflection.snapshot);
            }
        };

        this.aiWorkersPromise = this.workerPool.processAll(AIService).catch(err => console.warn('[AI WORKERS] Error:', err));
    }

    getFreshContext(username, technicalIdentity, cognitiveProfile = null, curationEvidence = null) {
        return ContextBuilder.build(username, this.results, technicalIdentity, cognitiveProfile, curationEvidence, () => this.coordinator.getSummaryForChat());
    }
}
