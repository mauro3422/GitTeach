'use strict';
/**
 * Bug Replicator Test Script v2
 * Issue: Colors change on hover/resize, all boxes light up together
 */

const fs = require('fs');
const path = require('path');

// ===== RESULTS COLLECTOR =====
const results = {
    timestamp: new Date().toISOString(),
    steps: [],
    diagnosis: ''
};

function logStep(num, name, pass, details) {
    details = details || {};
    const step = { step: num, name: name, pass: pass };
    Object.keys(details).forEach(function (k) { step[k] = details[k]; });
    results.steps.push(step);
    console.log('[STEP ' + num + '] ' + name + ': ' + (pass ? 'PASS' : 'FAIL'));
    Object.keys(details).forEach(function (k) {
        console.log('  ' + k + ': ' + JSON.stringify(details[k]));
    });
}

// ===== MOCK THEMEMANAGER =====
const ThemeManager = {
    neonPalette: ['#3fb950', '#58a6ff', '#f778ba', '#a5d6ff', '#f0883e', '#d2a8ff', '#ff7b72', '#7ee787'],
    _nodeColorCache: {},

    getRandomNeonColor: function (seed) {
        var hash = 5381;
        for (var i = 0; i < seed.length; i++) {
            hash = ((hash << 5) + hash) + seed.charCodeAt(i) + i;
        }
        return this.neonPalette[Math.abs(hash) % this.neonPalette.length];
    },

    getNeonColorForId: function (nodeId) {
        if (!this._nodeColorCache[nodeId]) {
            this._nodeColorCache[nodeId] = this.getRandomNeonColor(nodeId);
        }
        return this._nodeColorCache[nodeId];
    }
};

// ===== MOCK CONTAINER RENDERER =====
var ContainerRenderer = {
    getNodeColor: function (node) {
        if (node.isRepoContainer || node.isStickyNote) {
            return ThemeManager.getNeonColorForId(node.id);
        }
        return '#3fb950';
    },

    render: function (nodes) {
        var renderData = [];
        Object.keys(nodes).forEach(function (key) {
            var node = nodes[key];
            if (!node.isRepoContainer) return;
            var color = ContainerRenderer.getNodeColor(node);
            renderData.push({ id: node.id, color: color, isHovered: node.isHovered });
        });
        return renderData;
    }
};

// ===== SIMULATION FUNCTIONS =====
function simulateHover(nodes, targetId) {
    Object.keys(nodes).forEach(function (key) {
        nodes[key].isHovered = (nodes[key].id === targetId);
    });
}

function simulateResize(nodes, targetId) {
    var newNodes = {};
    Object.keys(nodes).forEach(function (key) {
        newNodes[key] = Object.assign({}, nodes[key]);
    });
    if (newNodes[targetId]) {
        newNodes[targetId].dimensions = { w: 200, h: 150 };
    }
    return newNodes;
}

// ===== SETUP =====
console.log('=== BUG REPLICATOR v2: Color/Hover Test ===\n');

var nodes = {
    custom_001: { id: 'custom_001', isRepoContainer: true, isHovered: false },
    custom_002: { id: 'custom_002', isRepoContainer: true, isHovered: false },
    custom_003: { id: 'custom_003', isRepoContainer: true, isHovered: false }
};

// ===== STEP 1 =====
var render1 = ContainerRenderer.render(nodes);
var colors1 = render1.map(function (r) { return r.color; });
var uniqueColors = [];
colors1.forEach(function (c) { if (uniqueColors.indexOf(c) === -1) uniqueColors.push(c); });
logStep(1, 'Initial Colors', uniqueColors.length === 3, { colors: render1 });

// ===== STEP 2 =====
simulateHover(nodes, 'custom_002');
var render2 = ContainerRenderer.render(nodes);
var hoveredNodes = render2.filter(function (r) { return r.isHovered; });
logStep(2, 'Hover on custom_002', hoveredNodes.length === 1 && hoveredNodes[0].id === 'custom_002',
    { hoveredIds: hoveredNodes.map(function (r) { return r.id; }) });

// ===== STEP 3 =====
var colors2 = render2.map(function (r) { return r.color; });
var colorsStable = JSON.stringify(colors1) === JSON.stringify(colors2);
logStep(3, 'Colors stable after hover', colorsStable, { before: colors1, after: colors2 });

// ===== STEP 4 =====
nodes = simulateResize(nodes, 'custom_002');
var render3 = ContainerRenderer.render(nodes);
var colors3 = render3.map(function (r) { return r.color; });
var colorsStable2 = JSON.stringify(colors1) === JSON.stringify(colors3);
logStep(4, 'Colors stable after resize', colorsStable2, { before: colors1, after: colors3 });

// ===== STEP 5 =====
var cacheKeys = Object.keys(ThemeManager._nodeColorCache);
logStep(5, 'Cache populated', cacheKeys.length === 3, { cacheSize: cacheKeys.length });

// ===== DIAGNOSIS =====
var allPassed = results.steps.every(function (s) { return s.pass; });
if (allPassed) {
    results.diagnosis = 'ThemeManager cache works in isolation. Bug is in real rendering layer.';
} else {
    var failed = results.steps.filter(function (s) { return !s.pass; }).map(function (s) { return s.name; });
    results.diagnosis = 'Failed: ' + failed.join(', ');
}

console.log('\n=== DIAGNOSIS ===');
console.log(results.diagnosis);

console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(results, null, 2));

// Save results
var reportPath = path.join(__dirname, 'bug_color_hover_results.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log('\nSaved to: ' + reportPath);
