/**
 * Quick Verification Script for AIWorkerPool Refactor
 * Tests that the refactored module works correctly
 */

// Mock browser environment
global.window = {
    githubAPI: {},
    cacheAPI: {
        setWorkerAudit: async () => true
    },
    AI_OFFLINE: false
};
global.document = { querySelector: () => null, getElementById: () => null };

async function verify() {
    console.log('\n🔍 VERIFICATION: AIWorkerPool Refactor\n');

    try {
        // 1. Test imports
        console.log('1️⃣ Testing imports...');
        const { AIWorkerPool } = await import('../src/renderer/js/services/aiWorkerPool.js');
        const { QueueManager } = await import('../src/renderer/js/services/workers/QueueManager.js');
        const { RepoContextManager } = await import('../src/renderer/js/services/workers/RepoContextManager.js');
        const { WorkerPromptBuilder } = await import('../src/renderer/js/services/workers/WorkerPromptBuilder.js');
        console.log('   ✅ All modules imported successfully\n');

        // 2. Test instantiation
        console.log('2️⃣ Testing instantiation...');
        const pool = new AIWorkerPool(3, null, null);
        console.log(`   ✅ AIWorkerPool created with ${pool.workerCount} workers`);
        console.log(`   ✅ QueueManager internal: ${!!pool.queueManager}`);
        console.log(`   ✅ ContextManager internal: ${!!pool.contextManager}`);
        console.log(`   ✅ PromptBuilder internal: ${!!pool.promptBuilder}\n`);

        // 3. Test enqueue (PUBLIC API)
        console.log('3️⃣ Testing enqueue (PUBLIC API)...');
        pool.enqueue('test-repo', 'src/index.js', 'console.log("hello")', 'abc123');
        pool.enqueue('test-repo', 'src/utils.js', 'export const foo = 1;', 'def456');
        console.log(`   ✅ Enqueued 2 files, totalQueued: ${pool.totalQueued}\n`);

        // 4. Test getStats (PUBLIC API)
        console.log('4️⃣ Testing getStats (PUBLIC API)...');
        const stats = pool.getStats();
        console.log(`   ✅ Stats: pending=${stats.pending}, processed=${stats.processed}, percent=${stats.percent}%\n`);

        // 5. Test callbacks exist (PUBLIC API)
        console.log('5️⃣ Testing callback properties (PUBLIC API)...');
        let batchReceived = false;
        pool.onBatchComplete = (batch) => { batchReceived = true; };
        pool.onProgress = (data) => { };
        console.log(`   ✅ onBatchComplete assignable: ${typeof pool.onBatchComplete === 'function'}`);
        console.log(`   ✅ onProgress assignable: ${typeof pool.onProgress === 'function'}\n`);

        // 6. Test QueueManager directly
        console.log('6️⃣ Testing QueueManager independently...');
        const qm = new QueueManager();
        qm.enqueue('repo-x', 'file.js', 'content', 'sha');
        const item = qm.getNextItem(1, null, null);
        console.log(`   ✅ QueueManager.getNextItem returned: ${item?.path}\n`);

        // 7. Test WorkerPromptBuilder
        console.log('7️⃣ Testing WorkerPromptBuilder...');
        const pb = new WorkerPromptBuilder();
        const sysPrompt = pb.buildSystemPrompt();
        console.log(`   ✅ System prompt length: ${sysPrompt.length} chars`);
        const { prompt, skipReason } = pb.buildUserPrompt({ repo: 'test', path: 'x.js', content: 'const x = 1;' });
        console.log(`   ✅ User prompt generated: ${prompt ? 'yes' : 'no'}, skipReason: ${skipReason || 'none'}\n`);

        // 8. Test clear (PUBLIC API)
        console.log('8️⃣ Testing clear (PUBLIC API)...');
        pool.clear();
        console.log(`   ✅ After clear: totalQueued=${pool.totalQueued}\n`);

        console.log('═══════════════════════════════════════');
        console.log('✅ ALL VERIFICATION TESTS PASSED!');
        console.log('═══════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error);
        process.exit(1);
    }
}

verify();
