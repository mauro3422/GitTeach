import fs from 'fs';
import path from 'path';
import { ROOT, SESSION_ID, SESSION_PATH, MOCK_PERSISTENCE_PATH } from './TracerContext.js';
import { TracerEnvironment } from './TracerEnvironment.js';
import { GithubMock } from './GithubMock.js';
import { Globals } from './Globals.js';
import { loggerCapture } from './LoggerCapture.js';

/**
 * TracerEngine - Master orchestrator for diagnostic runs
 * 
 * Responsabilidad: Ejecutar las fases de análisis agéntico y producir
 * el reporte final SUMMARY.json.
 */

export class TracerEngine {
    constructor() {
        this.startTime = new Date();
        this.version = '2.1-Forensic';
        this.metabolicSnapshot = { before: null, after: null };
        this.latestStats = null;
        this.latestTotalFiles = 0;
    }

    async run() {
        // 1. Setup Environment
        TracerEnvironment.setupHighlanderProtocol();
        TracerEnvironment.initializeSessionFolders();

        // 2. Start Forensic Logging
        loggerCapture.start();

        console.log(`\n🧬 TRACER ENGINE START: ${SESSION_ID}`);

        // 3. Auth & Globals (Critical order!)
        const authToken = GithubMock.loadToken();
        Globals.inject(authToken);

        // 4. Dynamic Import of App Services
        const { AIService } = await import('../../../src/renderer/js/services/aiService.js');
        const { ProfileAnalyzer } = await import('../../../src/renderer/js/services/profileAnalyzer.js');
        const { DebugLogger } = await import('../../../src/renderer/js/utils/debugLogger.js');
        const { ToolRegistry } = await import('../../../src/renderer/js/services/toolRegistry.js');

        // 5. Health Check
        try {
            await AIService.callAI("Test", "OK", 0.0);
            console.log('✅ AI Server ONLINE.');
        } catch (e) {
            console.error('❌ AI Server OFFLINE or Error:', e.message);
            process.exit(1);
        }

        // Setup DebugLogger for Node FS
        DebugLogger.setEnabled(true);
        // Inject dependencies directly into transport for Node environment
        DebugLogger.transport.fs = fs;
        DebugLogger.transport.path = path;
        DebugLogger.transport.isNode = true;

        DebugLogger.session.sessionPath = SESSION_PATH;
        DebugLogger.session.sessionId = SESSION_ID;

        let totalFilesOnDisk = 0;
        try {
            const tempPath = path.join(ROOT, 'temp_file_count.txt');
            if (fs.existsSync(tempPath)) {
                totalFilesOnDisk = parseInt(fs.readFileSync(tempPath, 'utf8').trim());
                this.latestTotalFiles = totalFilesOnDisk;
            }
        } catch (e) { }

        // 6. Capture "BEFORE" state
        console.log('🧬 Capturing Metabolic Baseline...');
        this.metabolicSnapshot.before = {
            identity: await window.cacheAPI.getTechnicalIdentity('mauro3422'),
            profile: await window.cacheAPI.getCognitiveProfile('mauro3422')
        };

        console.log('--- PHASE 1: WORKER SCAN (100% Coverage Goal) ---');
        // DI INJECTION: Pass the mock API explicitly to bypass global scope issues
        const analyzer = new ProfileAnalyzer(DebugLogger, { githubAPI: global.window.githubAPI });

        let lastReport = 0;
        const REPORT_INTERVAL = 5;

        const results = await analyzer.analyze('mauro3422', (step) => {
            // ALWAYS update latestStats if possible to ensure summaries are fresh
            if (analyzer.coordinator) {
                const stats = analyzer.coordinator.getStats();
                this.latestStats = stats;
                // CRITICAL: Ensure filesOnDisk is NEVER 0 if inventory has files
                if ((!this.latestTotalFiles || this.latestTotalFiles === 0) && stats.totalFiles > 0) {
                    this.latestTotalFiles = stats.totalFiles;
                }
            }

            if (step.type === 'Progreso') {
                const p = step.percent;
                // Log and flush summary at intervals OR on phase completion
                if (p >= lastReport + REPORT_INTERVAL || p === 100 || p < lastReport) {
                    process.stdout.write(`\r   [PROGRESS] ${p}% | Scanned: ${this.latestStats?.analyzed || 0} / ${this.latestTotalFiles}`);
                    lastReport = p;
                    if (p === 100) console.log("");

                    this.generateSummary('RUNNING');
                }
            } else if (step.type === 'DeepMemoryReady') {
                console.log(`\n🧠 AUTONOMOUS REACTION: ${step.message}`);
                this.generateSummary('RUNNING');
            }
        });

        // Ensure stats are fresh after analyze() returns (Phase 1 finished)
        this.latestStats = analyzer.coordinator.getStats();

        console.log(`\n📊 FINAL COVERAGE REPORT:`);
        console.log(`   - Files Scanned:   ${this.latestStats.analyzed}`);

        // Fix: Clamp to 100% if analyzed > totalFilesOnDisk (due to temp file lag or mock mismatch)
        const denominator = Math.max(this.latestTotalFiles, this.latestStats.analyzed);
        const coverage = denominator > 0 ? Math.round((this.latestStats.analyzed / denominator) * 100) : 0;

        console.log(`   - Coverage Index:  ${coverage}%`);

        console.log('\n--- PHASE 2: INTELLIGENCE SYNTHESIS ---');
        if (analyzer.fullIntelligencePromise) {
            try {
                await analyzer.fullIntelligencePromise;
            } catch (e) {
                console.error('❌ PHASE 2 FAILED:', e);
            }
        }

        console.log("⏳ Waiting 10s for Autonomous Reactions (Streaming)...");
        await new Promise(r => setTimeout(r, 10000));

        // 7. Phase 3: Interactive Chat Simulation (Tool-Augmented Retrieval Verification)
        console.log('\n--- PHASE 3: INTERACTIVE CHAT SIMULATION (TOOLS) ---');
        try {
            const prompts = [
                "Generame un README para mi perfil basado en mi código", // Tests general identity
                "¿Cuáles son mis hábitos de programación según el análisis profundo?", // Tests query_thematic_analysis
                "¿Qué nivel de salud lógica (SOLID) tengo?" // Tests query_technical_metrics
            ];

            for (const testPrompt of prompts) {
                console.log(`\n🤖 USER INPUT: "${testPrompt}"`);
                const simStart = Date.now();
                let result;
                const watchdog = new Promise((resolve, reject) =>
                    setTimeout(() => reject(new Error('AI Service call timed out after 180s')), 180000)
                );
                try {
                    result = await Promise.race([
                        AIService.processIntent(testPrompt, 'mauro3422'),
                        watchdog
                    ]);
                } catch (e) {
                    console.error(`❌ AI Service call for "${testPrompt}" failed or timed out:`, e.message);
                    continue; // Skip to the next prompt
                }
                const simDuration = Date.now() - simStart;
                console.log(`📢 AI RESPONSE: ${result.message.substring(0, 150)}... (${simDuration}ms)`);

                // Check Context-Light Protections
                if (AIService.currentSessionContext.includes("INSTRUCCIÓN PARA EL ROUTER") &&
                    AIService.currentSessionContext.indexOf("INSTRUCCIÓN PARA EL ROUTER") < 500) {
                    console.log("✅ CONTEXT-LIGHT: Router Instructions found at THE TOP.");
                }

                // Check RAG / Tool Usage logic
                if (AIService.currentSessionContext.includes("RELEVANT TECHNICAL MEMORY (RAG)")) {
                    console.log("✅ TOOL-AUGMENTED: RAG section successfully injected into context.");
                }

                // FLIGHT RECORDER (Session Log)
                try {
                    const sessionLogPath = path.join(MOCK_PERSISTENCE_PATH, 'chat_sessions');
                    if (!fs.existsSync(sessionLogPath)) fs.mkdirSync(sessionLogPath, { recursive: true });

                    const logEntry = {
                        timestamp: new Date().toISOString(),
                        input: testPrompt,
                        intent_router: {
                            selected_tool: result.meta?.intent,
                            thought: result.meta?.thought,
                            search_terms: result.meta?.searchTerms,
                            memory_source: result.meta?.memorySource
                        },
                        response: result.message
                    };

                    fs.appendFileSync(
                        path.join(sessionLogPath, `session_TRACE_${SESSION_ID}.jsonl`),
                        JSON.stringify(logEntry) + '\n'
                    );
                    console.log("📝 Interaction saved to Flight Recorder.");
                } catch (logErr) {
                    console.warn("⚠️ Flight Recorder failed:", logErr.message);
                }
            }

        } catch (e) {
            console.error("❌ SIMULATION FAILED:", e);
        }

        // 8. Capture "AFTER" state
        this.metabolicSnapshot.after = {
            identity: await window.cacheAPI.getTechnicalIdentity('mauro3422'),
            profile: await window.cacheAPI.getCognitiveProfile('mauro3422'),
            architecture: await window.cacheAPI.getTechnicalIdentity('theme:architecture:mauro3422'),
            habits: await window.cacheAPI.getTechnicalIdentity('theme:habits:mauro3422')
        };

        // FINAL REFRESH: Ensure all worker data is captured
        this.latestStats = analyzer.coordinator.getStats();
        if (!this.latestTotalFiles || this.latestTotalFiles === 0) {
            this.latestTotalFiles = this.latestStats.totalFiles;
        }

        this.generateSummary('COMPLETE');

        // EXPORT: Dump final Session Context (Requested by User)
        try {
            if (AIService.currentSessionContext) {
                // 1. Gather Extended Data
                const allBlueprints = await window.cacheAPI.getAllRepoBlueprints() || [];

                // 2. Fetch specific layers for identity
                const identityLayers = {
                    architecture: this.metabolicSnapshot.after?.architecture,
                    habits: this.metabolicSnapshot.after?.habits
                };

                fs.writeFileSync(path.join(MOCK_PERSISTENCE_PATH, 'context_user.json'), JSON.stringify({
                    timestamp: new Date().toISOString(),
                    contextCurrent: AIService.currentSessionContext,
                    identityBroker: this.metabolicSnapshot.after?.identity,
                    layeredMemory: identityLayers,
                    blueprints: allBlueprints
                }, null, 2));

                // 3. Export individual blueprints for easier reading
                const blueprintsDir = path.join(SESSION_PATH, 'blueprints');
                if (!fs.existsSync(blueprintsDir)) fs.mkdirSync(blueprintsDir);

                for (const bp of allBlueprints) {
                    fs.writeFileSync(
                        path.join(blueprintsDir, `${bp.repoName}_blueprint.json`),
                        JSON.stringify(bp, null, 2)
                    );
                }

                console.log("📝 Saved context_user.json and individual blueprints to session folder.");
            }
        } catch (e) {
            console.warn("⚠️ Could not save context_user.json or blueprints:", e.message);
        }

        console.log(`\n✅ TRACE COMPLETE. Sessions: ${SESSION_ID}`);
    }

    generateSummary(status = 'RUNNING') {
        const stats = this.latestStats || { analyzed: 0 };
        const totalFilesOnDisk = this.latestTotalFiles;

        const summary = {
            tracerVersion: this.version,
            sessionId: SESSION_ID,
            status: status,
            timestamp: {
                start: this.startTime.toISOString(),
                current: new Date().toISOString()
            },
            metrics: {
                filesAnalyzed: stats.analyzed,
                filesOnDisk: totalFilesOnDisk,
                coveragePercent: totalFilesOnDisk > 0 ? Math.round((stats.analyzed / totalFilesOnDisk) * 100) : 0
            },
            metabolicDelta: {
                evolved: JSON.stringify(this.metabolicSnapshot.before) !== JSON.stringify(this.metabolicSnapshot.after),
                architectureLayered: !!this.metabolicSnapshot.after?.architecture,
                snapshot: this.metabolicSnapshot
            },
            coordinatorStats: stats,
            terminalHistory: loggerCapture.getHistory(300),
            nodeInfo: {
                version: process.version,
                platform: process.platform,
                arch: process.arch
            },
            errors: loggerCapture.getErrors(),
            performance: {
                workerLatency: stats.performance || { totalAiMs: 0, count: 0, slowestFile: { path: '', ms: 0 } },
                totalTraceMs: Date.now() - this.startTime.getTime(),
                metabolicSynthesis: this.metabolicSnapshot.after?.performance || {}
            },
            integrityAudit: status === 'COMPLETE' ? this.runIntegrityAudit() : 'PENDING'
        };

        fs.writeFileSync(path.join(SESSION_PATH, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
    }

    async runIntegrityAudit() {
        const layers = [
            { id: 'Identity Broker', key: 'mauro3422' },
            { id: 'Architecture Layer', key: 'theme:architecture:mauro3422' },
            { id: 'Habits Layer', key: 'theme:habits:mauro3422' },
            { id: 'Health Metrics', key: 'metrics:health:mauro3422' }
        ];

        const audit = {};
        for (const layer of layers) {
            try {
                const content = await window.cacheAPI.getTechnicalIdentity(layer.key);
                if (content) {
                    audit[layer.id] = { status: 'VALID', type: typeof content };
                } else {
                    audit[layer.id] = { status: 'MISSING' };
                }
            } catch (e) {
                audit[layer.id] = { status: 'ERROR', error: e.message };
            }
        }
        return audit;
    }
}
