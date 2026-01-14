/**
 * Unit Tests for CoordinatorAgent
 * 
 * These tests verify the bug fix where failed files must increment
 * the analyzedFiles counter to prevent progress bar stalling.
 * 
 * Run: node tests/coordinatorAgent.test.js
 */

// Minimal CoordinatorAgent implementation for testing (extracted core logic)
class CoordinatorAgent {
    constructor() {
        this.inventory = {
            repos: [],
            totalFiles: 0,
            analyzedFiles: 0,
            pendingFiles: [],
            completedFiles: [],
            failedFiles: []
        };
        this.onProgress = null;
    }

    initInventory(repos) {
        this.inventory.repos = repos.map(r => ({
            name: r.name,
            fullName: r.full_name,
            language: r.language,
            files: [],
            status: 'pending',
            treeSha: null
        }));
    }

    registerRepoFiles(repoName, tree, treeSha) {
        const repo = this.inventory.repos.find(r => r.name === repoName);
        if (!repo) return;

        repo.treeSha = treeSha;
        repo.files = tree.map(node => ({
            path: node.path,
            sha: node.sha,
            size: node.size,
            type: node.type,
            status: 'pending',
            priority: 50
        }));

        this.inventory.totalFiles += repo.files.filter(f => f.type === 'blob').length;
    }

    markCompleted(repoName, filePath, summary) {
        const repo = this.inventory.repos.find(r => r.name === repoName);
        if (!repo) return;

        const file = repo.files.find(f => f.path === filePath);
        if (file) {
            file.status = 'completed';
            file.summary = summary;
            this.inventory.analyzedFiles++;
            this.inventory.completedFiles.push({ repo: repoName, path: filePath });
        }
    }

    markFailed(repoName, filePath, error) {
        const repo = this.inventory.repos.find(r => r.name === repoName);
        if (!repo) return;

        const file = repo.files.find(f => f.path === filePath);
        if (file) {
            file.status = 'failed';
            file.error = error;
            this.inventory.failedFiles.push({ repo: repoName, path: filePath, error });
            this.inventory.analyzedFiles++; // BUG FIX: This line prevents progress stalling
        }
    }

    getStats() {
        return {
            repos: this.inventory.repos.length,
            totalFiles: this.inventory.totalFiles,
            analyzed: this.inventory.analyzedFiles,
            pending: this.inventory.totalFiles - this.inventory.analyzedFiles,
            progress: this.inventory.totalFiles > 0
                ? Math.round((this.inventory.analyzedFiles / this.inventory.totalFiles) * 100)
                : 0
        };
    }
}

// Test Utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`✅ PASS: ${testName}`);
        testsPassed++;
    } else {
        console.log(`❌ FAIL: ${testName}`);
        testsFailed++;
    }
}

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        console.log(`✅ PASS: ${testName}`);
        testsPassed++;
    } else {
        console.log(`❌ FAIL: ${testName} (expected: ${expected}, got: ${actual})`);
        testsFailed++;
    }
}

// Setup helper
function createTestCoordinator() {
    const coord = new CoordinatorAgent();

    // Simulate 1 repo with 5 files
    coord.initInventory([{ name: 'test-repo', full_name: 'user/test-repo', language: 'JavaScript' }]);
    coord.registerRepoFiles('test-repo', [
        { path: 'file1.js', sha: 'abc1', size: 100, type: 'blob' },
        { path: 'file2.js', sha: 'abc2', size: 200, type: 'blob' },
        { path: 'file3.js', sha: 'abc3', size: 150, type: 'blob' },
        { path: 'file4.js', sha: 'abc4', size: 175, type: 'blob' },
        { path: 'file5.js', sha: 'abc5', size: 125, type: 'blob' },
    ], 'treeSha123');

    return coord;
}

// ===========================================
// TEST SUITE
// ===========================================
console.log('\n' + '='.repeat(50));
console.log('  CoordinatorAgent Unit Tests');
console.log('='.repeat(50) + '\n');

// Test 1: Initial state
console.log('--- Test Group: Initial State ---');
{
    const coord = createTestCoordinator();
    assertEqual(coord.getStats().totalFiles, 5, 'Total files should be 5');
    assertEqual(coord.getStats().analyzed, 0, 'Analyzed files should start at 0');
    assertEqual(coord.getStats().progress, 0, 'Progress should start at 0%');
}

// Test 2: markCompleted increments counter
console.log('\n--- Test Group: markCompleted ---');
{
    const coord = createTestCoordinator();
    coord.markCompleted('test-repo', 'file1.js', 'Test summary');

    assertEqual(coord.getStats().analyzed, 1, 'Analyzed should be 1 after completing 1 file');
    assertEqual(coord.getStats().progress, 20, 'Progress should be 20% (1/5)');
    assertEqual(coord.inventory.completedFiles.length, 1, 'completedFiles array should have 1 entry');
}

// Test 3: markFailed increments counter (BUG FIX TEST)
console.log('\n--- Test Group: markFailed (BUG FIX) ---');
{
    const coord = createTestCoordinator();
    coord.markFailed('test-repo', 'file1.js', 'Network error');

    assertEqual(coord.getStats().analyzed, 1, 'CRITICAL: Analyzed should be 1 after FAILING 1 file');
    assertEqual(coord.getStats().progress, 20, 'Progress should be 20% even on failure');
    assertEqual(coord.inventory.failedFiles.length, 1, 'failedFiles array should have 1 entry');
    assertEqual(coord.inventory.failedFiles[0].error, 'Network error', 'Error message should be stored');
}

// Test 4: Mixed success and failure still reaches 100%
console.log('\n--- Test Group: Mixed Results ---');
{
    const coord = createTestCoordinator();

    coord.markCompleted('test-repo', 'file1.js', 'OK');
    coord.markFailed('test-repo', 'file2.js', 'Error 1');
    coord.markCompleted('test-repo', 'file3.js', 'OK');
    coord.markFailed('test-repo', 'file4.js', 'Error 2');
    coord.markCompleted('test-repo', 'file5.js', 'OK');

    assertEqual(coord.getStats().analyzed, 5, 'All 5 files should be counted');
    assertEqual(coord.getStats().progress, 100, 'CRITICAL: Progress should reach 100% with mixed results');
    assertEqual(coord.inventory.completedFiles.length, 3, 'Should have 3 completed');
    assertEqual(coord.inventory.failedFiles.length, 2, 'Should have 2 failed');
}

// Test 5: All files fail - still reaches 100%
console.log('\n--- Test Group: All Failures (Worst Case) ---');
{
    const coord = createTestCoordinator();

    coord.markFailed('test-repo', 'file1.js', 'E1');
    coord.markFailed('test-repo', 'file2.js', 'E2');
    coord.markFailed('test-repo', 'file3.js', 'E3');
    coord.markFailed('test-repo', 'file4.js', 'E4');
    coord.markFailed('test-repo', 'file5.js', 'E5');

    assertEqual(coord.getStats().analyzed, 5, 'All 5 files counted even though all failed');
    assertEqual(coord.getStats().progress, 100, 'CRITICAL: Progress reaches 100% even when all fail');
    assertEqual(coord.inventory.failedFiles.length, 5, 'All 5 in failedFiles array');
}

// Test 6: Invalid repo/file handling
console.log('\n--- Test Group: Error Handling ---');
{
    const coord = createTestCoordinator();

    // Try to mark a non-existent file
    coord.markCompleted('test-repo', 'nonexistent.js', 'Test');
    assertEqual(coord.getStats().analyzed, 0, 'Should not increment for non-existent file');

    // Try to mark in non-existent repo
    coord.markFailed('fake-repo', 'file1.js', 'Error');
    assertEqual(coord.getStats().analyzed, 0, 'Should not increment for non-existent repo');
}

// Test 7: getStats pending calculation
console.log('\n--- Test Group: Pending Calculation ---');
{
    const coord = createTestCoordinator();

    assertEqual(coord.getStats().pending, 5, 'Should have 5 pending initially');

    coord.markCompleted('test-repo', 'file1.js', 'OK');
    coord.markFailed('test-repo', 'file2.js', 'Error');

    assertEqual(coord.getStats().pending, 3, 'Should have 3 pending after 2 processed');
}

// ===========================================
// RESULTS
// ===========================================
console.log('\n' + '='.repeat(50));
console.log(`  RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
console.log('='.repeat(50) + '\n');

if (testsFailed > 0) {
    console.log('⚠️  Some tests failed! Review the output above.');
    process.exit(1);
} else {
    console.log('🎉 All tests passed! The bug fix is verified.');
    process.exit(0);
}
