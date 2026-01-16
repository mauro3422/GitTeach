import fs from 'fs';
import path from 'path';
import { ROOT, SESSION_ID, SESSION_PATH } from './TracerContext.js';
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
            totalFilesOnDisk = parseInt(fs.readFileSync(path.join(ROOT, 'temp_file_count.txt'), 'utf8').trim());
            this.latestTotalFiles = totalFilesOnDisk;
        } catch (e) { }

        // 6. Capture "BEFORE" state
        console.log('🧬 Capturing Metabolic Baseline...');
        this.metabolicSnapshot.before = {
            identity: await window.cacheAPI.getTechnicalIdentity('mauro3422'),
            profile: await window.cacheAPI.getCognitiveProfile('mauro3422')
        };

        console.log('--- PHASE 1: WORKER SCAN (100% Coverage Goal) ---');
        const analyzer = new ProfileAnalyzer(DebugLogger);

        let lastReport = 0;
        const REPORT_INTERVAL = 20;

        const results = await analyzer.analyze('mauro3422', (step) => {
            if (step.type === 'Progreso') {
                const p = step.percent;
                if (p >= lastReport + REPORT_INTERVAL || p === 100) {
                    const stats = analyzer.coordinator.getStats();
                    this.latestStats = stats;
                    process.stdout.write(`\r   [PROGRESS] ${p}% | Scanned: ${stats.analyzed} / ${totalFilesOnDisk}`);
                    lastReport = p;
                    if (p === 100) console.log("");

                    // Periodic Flush for resilience
                    this.generateSummary('RUNNING');
                }
            } else if (step.type === 'DeepMemoryReady') {
                console.log(`\n🧠 AUTONOMOUS REACTION: ${step.message}`);
                this.generateSummary('RUNNING');
            }
        });

        const stats = analyzer.coordinator.getStats();
        console.log(`\n📊 FINAL COVERAGE REPORT:`);
        console.log(`   - Files Scanned:   ${stats.analyzed}`);
        console.log(`   - Coverage Index:  ${totalFilesOnDisk > 0 ? Math.round((stats.analyzed / totalFilesOnDisk) * 100) : 0}%`);

        console.log('\n--- PHASE 2: INTELLIGENCE SYNTHESIS ---');
        if (analyzer.fullIntelligencePromise) await analyzer.fullIntelligencePromise;

        console.log("⏳ Waiting 10s for Autonomous Reactions (Streaming)...");
        await new Promise(r => setTimeout(r, 10000));

        // 7. Phase 3: Interactive Chat Simulation (RAG Verification)
        console.log('\n--- PHASE 3: INTERACTIVE CHAT SIMULATION (RAG) ---');
        try {
            const testPrompt = "Generame un README para mi perfil basado en mi código";
            console.log(`🤖 USER INPUT: "${testPrompt}"`);

            // We use the real AIService to test the full Router -> Tool -> Chat flow
            const result = await AIService.processIntent(testPrompt, 'mauro3422');

            console.log(`\n📢 AI RESPONSE:\n${result.message}`);

            if (AIService.currentSessionContext && AIService.currentSessionContext.includes("MEMORIA ASOCIATIVA")) {
                console.log("\n✅ RAG SUCCESS: 'MEMORIA ASOCIATIVA' section found in Session Context.");
            } else {
                console.log("\n⚠️ RAG NOTE: 'MEMORIA ASOCIATIVA' tag not found in context (check if tool was triggered).");
            }

        } catch (e) {
            console.error("❌ SIMULATION FAILED:", e);
        }

        // 8. Capture "AFTER" state
        this.metabolicSnapshot.after = {
            identity: await window.cacheAPI.getTechnicalIdentity('mauro3422'),
            profile: await window.cacheAPI.getCognitiveProfile('mauro3422')
        };

        this.generateSummary('COMPLETE');

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
            integrityAudit: status === 'COMPLETE' ? this.runIntegrityAudit() : 'PENDING'
        };

        fs.writeFileSync(path.join(SESSION_PATH, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
    }

    runIntegrityAudit() {
        const artifacts = [
            'technical_identity.json',
            'curation_evidence.json',
            'cognitive_profile.json'
        ];

        const audit = {};
        for (const file of artifacts) {
            const p = path.join(SESSION_PATH, 'mock_persistence', file);
            if (fs.existsSync(p)) {
                try {
                    const content = fs.readFileSync(p, 'utf8');
                    const size = content.length;
                    JSON.parse(content); // Test valid JSON
                    audit[file] = { status: 'VALID', size: `${(size / 1024).toFixed(2)} KB` };
                } catch (e) {
                    audit[file] = { status: 'INVALID_JSON', error: e.message };
                }
            } else {
                audit[file] = { status: 'MISSING' };
            }
        }
        return audit;
    }
}
