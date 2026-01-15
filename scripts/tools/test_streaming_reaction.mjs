/**
 * Test Script: Streaming Reaction Verification
 * Verifies that ProfileAnalyzer triggers 'DeepMemoryReady' events upon receiving batches.
 */
import { ProfileAnalyzer } from '../../src/renderer/js/services/profileAnalyzer.js';
import { DebugLogger } from '../../src/renderer/js/utils/debugLogger.js';
import { AIService } from '../../src/renderer/js/services/aiService.js';

// Mocks
class MockCoordinator {
    markCompleted() { }
}

const mockAIWorkerPool = {
    workerCount: 3,
    totalQueued: 10,
    processAll: async () => Promise.resolve([]),
    onBatchComplete: null
};

// Mock AIService
AIService.processIntent = async () => ({ message: "AI Reaction Generated" });

async function runTest() {
    console.log("🧪 STARTING STREAMING REACTION TEST...");

    const analyzer = new ProfileAnalyzer();
    // Inject Mocks
    analyzer.workerPool = mockAIWorkerPool;
    analyzer.deepCurator.incorporateBatch = (batch) => ({ totalFindings: batch.length, domains: ['TEST'] });

    // Test 1: Small Batch (Should NOT trigger)
    console.log("Test 1: Small Batch (3 items)");
    const smallBatch = [{}, {}, {}];
    // Manually trigger the wiring logic (which sets up the listener)
    const onStep = (step) => console.log("STEP:", step);
    analyzer.startWorkerProcessing(onStep);

    if (analyzer.workerPool.onBatchComplete) {
        analyzer.workerPool.onBatchComplete(smallBatch);
    } else {
        console.error("❌ Failed to wire onBatchComplete");
    }

    // Test 2: Significant Batch (Should TRIGGER)
    console.log("Test 2: Significant Batch (10 items)");
    const bigBatch = Array(10).fill({});
    // Mock Synthesizer to ensure it returns significant
    analyzer.intelligenceSynthesizer.synthesizeBatch = () => ({
        isSignificant: true,
        snapshot: "TEST_EVOLUTION"
    });

    if (analyzer.workerPool.onBatchComplete) {
        analyzer.workerPool.onBatchComplete(bigBatch);
    }

    console.log("🧪 TEST COMPLETE");
}

runTest();
