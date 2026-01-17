
import { TracerEnvironment } from './scripts/tools/tracer/TracerEnvironment.js';
TracerEnvironment.setupHighlanderProtocol();

import { memoryManager } from './src/renderer/js/services/memory/MemoryManager.js';
import { Logger } from './src/renderer/js/utils/logger.js';

// Mock AIService in the environment if needed, but TracerEnvironment sets global.window
// We can spy on Logger
console.log("TEST: Starting Batching Verification...");

const findings = [];
for (let i = 0; i < 15; i++) {
    findings.push({
        repo: 'TestRepo',
        path: `file_${i}.js`,
        insight: `Insight ${i}`,
        evidence: `Evidence ${i}`,
        classification: 'Code'
    });
}

// 1. Store 15 findings (Batch Size is 10)
// Expectation: 
// - First 10 trigger immediate flush.
// - Next 5 wait for timer.

console.log(`TEST: Storing ${findings.length} findings...`);
for (const f of findings) {
    await memoryManager.storeFinding(f);
}

console.log("TEST: Findings stored. Buffer length should be 5.");
if (memoryManager.embeddingBuffer.length === 5) {
    console.log("✅ PASS: Buffer has 5 items pending.");
} else {
    console.error(`❌ FAIL: Buffer has ${memoryManager.embeddingBuffer.length} items (Expected 5).`);
}

console.log("TEST: Waiting 1000ms for timer flush...");
await new Promise(r => setTimeout(r, 10000)); // Wait longer than 500ms

if (memoryManager.embeddingBuffer.length === 0) {
    console.log("✅ PASS: Buffer is empty (Timer flushed).");
} else {
    console.error(`❌ FAIL: Buffer still has ${memoryManager.embeddingBuffer.length} items.`);
}

console.log("TEST: DONE");
process.exit(0);
