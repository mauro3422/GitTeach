/**
 * Test script for EventBus wildcard functionality
 */
import { EventBus } from '../src/renderer/js/core/EventBus.js';

// Test variables
let results = [];

// Helper to log results
function log(event, expected, actual) {
    const passed = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ event, expected, actual, passed });
    console.log(`${passed ? '✓' : '✗'} ${event}:`, actual);
}

// Test 1: Direct subscription
console.log('\n=== Test 1: Direct subscription ===');
const bus1 = new EventBus();
bus1.on('node:selected', (data) => log('node:selected', 'direct-data', data));
bus1.emit('node:selected', 'direct-data');

// Test 2: Namespace wildcard
console.log('\n=== Test 2: Namespace wildcard (node:*) ===');
const bus2 = new EventBus();
let nodeCreateCaptured = false;
let nodeDeleteCaptured = false;
bus2.on('node:*', (data) => {
    if (data.channel === 'node:create' && data.data === 'create-data') nodeCreateCaptured = true;
    if (data.channel === 'node:delete' && data.data === 'delete-data') nodeDeleteCaptured = true;
});
bus2.emit('node:create', 'create-data');
bus2.emit('node:delete', 'delete-data');
log('node:create captured by node:*', true, nodeCreateCaptured);
log('node:delete captured by node:*', true, nodeDeleteCaptured);

// Test 3: Global wildcard
console.log('\n=== Test 3: Global wildcard (*) ===');
const bus3 = new EventBus();
let globalCaptured = [];
bus3.on('*', (data) => globalCaptured.push(data));
bus3.emit('ui:click', 'click-data');
bus3.emit('node:selected', 'selected-data');
log('* captures ui:click', [{ channel: 'ui:click', data: 'click-data' }, { channel: 'node:selected', data: 'selected-data' }], globalCaptured);

// Test 4: Multiple levels
console.log('\n=== Test 4: Multiple levels (node:ui:*) ===');
const bus4 = new EventBus();
let nodeUiCaptured = false;
bus4.on('node:ui:*', (data) => {
    if (data.channel === 'node:ui:click' && data.data === 'ui-click-data') nodeUiCaptured = true;
});
bus4.emit('node:ui:click', 'ui-click-data');
log('node:ui:click captured by node:ui:*', true, nodeUiCaptured);

// Test 5: Unsubscribe works for wildcards
console.log('\n=== Test 5: Unsubscribe for wildcards ===');
const bus5 = new EventBus();
let wildcardCalled = false;
const unsubscribe = bus5.on('test:*', () => { wildcardCalled = true; });
bus5.emit('test:event', 'data');
const calledBefore = wildcardCalled;
unsubscribe();
wildcardCalled = false;
bus5.emit('test:event', 'data');
const calledAfter = wildcardCalled;
log('Wildcard called before unsubscribe', true, calledBefore);
log('Wildcard not called after unsubscribe', true, !calledAfter);

// Summary
console.log('\n=== Summary ===');
const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`Passed: ${passed}/${total}`);
if (passed === total) {
    console.log('🎉 All tests passed!');
} else {
    console.log('❌ Some tests failed.');
    results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.event}: expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)}`);
    });
}
