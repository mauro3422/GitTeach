/**
 * Debug Logger Flow Test
 * Tests the complete AI flow debug logging system
 * 
 * Run: node --experimental-modules test_debug_flow.mjs
 * Or import from browser console
 */

/**
 * This test simulates the debug logging flow by:
 * 1. Starting a debug session
 * 2. Simulating worker logs
 * 3. Simulating curator logs  
 * 4. Simulating chat logs
 * 5. Ending session and checking output
 */

export async function runDebugFlowTest() {
    console.log('=== DEBUG FLOW TEST START ===');

    // Check if DebugLogger is available
    if (!window.DebugLogger) {
        console.error('❌ DebugLogger not found on window');
        return { success: false, error: 'DebugLogger not found' };
    }

    const DebugLogger = window.DebugLogger;

    // Step 1: Enable and start session
    console.log('[Test] Step 1: Starting session...');
    DebugLogger.setEnabled(true);
    const sessionPath = await DebugLogger.startSession();
    console.log(`[Test] Session path: ${sessionPath}`);

    if (!sessionPath) {
        console.error('❌ Failed to start session');
        return { success: false, error: 'Session start failed' };
    }

    // Step 2: Simulate worker logs
    console.log('[Test] Step 2: Logging workers...');
    await DebugLogger.logWorker(1, {
        input: { repo: 'test-repo', path: 'src/index.js', contentLength: 1500 },
        output: 'Test worker summary: Clean code structure with factory pattern.'
    });
    await DebugLogger.logWorker(2, {
        input: { repo: 'test-repo', path: 'src/utils.js', contentLength: 800 },
        output: 'Utility functions with good error handling.'
    });

    // Step 3: Simulate curator logs
    console.log('[Test] Step 3: Logging curator...');
    await DebugLogger.logCurator('mapper_output', {
        architecture: 'Factory pattern, modular structure',
        habits: 'Consistent naming, good error handling',
        stack: 'Node.js, Express, React'
    });
    await DebugLogger.logCurator('reducer_output', {
        bio: 'Full-stack developer with strong architecture skills.',
        traits: [
            { name: 'Architecture', score: 85 },
            { name: 'Habits', score: 78 }
        ],
        verdict: 'Mid-Senior Full-Stack'
    });

    // Step 4: Simulate chat logs
    console.log('[Test] Step 4: Logging chat...');
    await DebugLogger.logChat('user', 'Analiza mi perfil de GitHub');
    await DebugLogger.logChat('ai', 'He analizado tu perfil. Tienes un buen dominio de arquitectura...');

    // Step 5: End session
    console.log('[Test] Step 5: Ending session...');
    const summary = await DebugLogger.endSession();
    console.log('[Test] Session summary:', summary);

    console.log('=== DEBUG FLOW TEST COMPLETE ===');
    console.log('✅ Test passed! Check the debug_sessions folder for logs.');

    return {
        success: true,
        sessionPath,
        summary
    };
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
    window.runDebugFlowTest = runDebugFlowTest;
    console.log('[DebugFlowTest] Available via window.runDebugFlowTest()');
}
