/**
 * verify_solid_integrity.js
 * Script de validación post-refactorización (v2.33+)
 * Verifica la integridad de la arquitectura modular y los contratos SOLID.
 */

import { InsightsCurator } from '../src/renderer/js/services/curator/InsightsCurator.js';
import { GlobalIdentityUpdater } from '../src/renderer/js/services/curator/GlobalIdentityUpdater.js';
import { FileFilter } from '../src/renderer/js/services/analyzer/FileFilter.js';
import { EvidenceStore } from '../src/renderer/js/services/curator/EvidenceStore.js';
import { AIClient } from '../src/renderer/js/services/ai/AIClient.js';

console.log('🔍 Starting SOLID Integrity Verification...');

async function testComponent(name, fn) {
    try {
        console.log(`\n--- Testing ${name} ---`);
        await fn();
        console.log(`✅ ${name}: SUCCESS`);
    } catch (e) {
        console.error(`❌ ${name}: FAILED | ${e.message}`);
        process.exit(1);
    }
}

async function run() {
    // 1. Component Instantiation
    await testComponent('InsightsCurator Instantiation', () => {
        const curator = new InsightsCurator();
        if (typeof curator.curate !== 'function') throw new Error('Missing curate() method');
    });

    await testComponent('FileFilter Delegation', () => {
        const filter = new FileFilter();
        const testTree = [
            { type: 'blob', path: 'src/logic.js' },
            { type: 'blob', path: 'node_modules/pkg/library.js' }
        ];
        const filtered = filter.identifyAnchorFiles(testTree);
        if (filtered.length !== 1) throw new Error('Filtrado incorrecto: node_modules no fue filtrado o el archivo src se perdió');
    });

    await testComponent('GlobalIdentityUpdater Consistency', () => {
        const updater = new GlobalIdentityUpdater();
        const testFindings = [{ repo: 'test', file: 'a.js', params: { insight: 'Code logic' } }];
        const curation = updater.curateFindings(testFindings);
        if (!curation.validInsights || curation.validInsights.length === 0) {
            throw new Error('Curación delegada falló: insights perdidos');
        }
    });

    await testComponent('AI Circuit Breaker Logic', async () => {
        const client = new AIClient();
        // Mock success
        client._onSuccess();
        if (client.consecutiveFailures !== 0) throw new Error('Success reset failed');

        // Mock failures
        client._onFailure();
        client._onFailure();
        client._onFailure();

        try {
            client._checkCircuit();
            throw new Error('Circuit Breaker failed to open after 3 failures');
        } catch (e) {
            if (!e.message.includes('Circuit Breaker OPEN')) throw e;
            console.log('   (Circuit correctly OPENed)');
        }
    });

    console.log('\n✨ ALL SOLID INTEGRITY TESTS PASSED! ✨');
}

run();
