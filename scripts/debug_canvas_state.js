/**
 * debug_canvas_state.js
 * Comprehensive diagnostic tool for the Pipeline Visualizer (ESM version).
 */

import { PIPELINE_NODES, CONNECTIONS } from '../src/renderer/js/views/pipeline/PipelineConstants.js';

// Configuration
const MAP_WIDTH = 80;
const MAP_HEIGHT = 24;
const REF_SCALE = 1200;

function getPositions() {
    const pos = {};
    Object.keys(PIPELINE_NODES).forEach(id => {
        const node = PIPELINE_NODES[id];
        if (node.isSatellite && node.orbitParent) {
            const parent = PIPELINE_NODES[node.orbitParent];
            const radius = (node.orbitRadius || 0.18) * 800;
            const angle = (node.orbitAngle || 0) * (Math.PI / 180);
            pos[id] = {
                id,
                x: (parent.x * REF_SCALE) + radius * Math.cos(angle),
                y: (parent.y * REF_SCALE) + radius * Math.sin(angle),
                type: 'SATELLITE'
            };
        } else {
            pos[id] = {
                id,
                x: node.x * REF_SCALE,
                y: node.y * REF_SCALE,
                type: 'NODE'
            };
        }
    });
    return pos;
}

function generateAsciiMap(pos) {
    const grid = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(' '));

    // Auto-calculate bounds
    const ObjectValues = Object.values(pos);
    const xs = ObjectValues.map(p => p.x);
    const ys = ObjectValues.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const scaleX = (maxX - minX) / (MAP_WIDTH - 2) || 1;
    const scaleY = (maxY - minY) / (MAP_HEIGHT - 2) || 1;

    ObjectValues.forEach(p => {
        const x = Math.floor((p.x - minX) / scaleX);
        const y = Math.floor((p.y - minY) / scaleY);
        if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
            grid[y][x] = p.type === 'SATELLITE' ? 's' : 'N';
        }
    });

    console.log("\n--- PIPELINE ASCII TOPOLOGY MAP ---");
    console.log("Legend: N = Node, s = Satellite\n");
    console.log("+" + "-".repeat(MAP_WIDTH) + "+");
    grid.forEach(row => console.log("|" + row.join('') + "|"));
    console.log("+" + "-".repeat(MAP_WIDTH) + "+");
}

function runAudit() {
    const pos = getPositions();
    console.log("\n--- PIPELINE TELEMETRY DUMP ---");

    console.log("\n[1] OBJECT POSITIONS (px):");
    Object.values(pos).sort((a, b) => a.x - b.x).forEach(p => {
        console.log(`  - ${p.id.padEnd(20)} | X: ${p.x.toFixed(0).padStart(4)} | Y: ${p.y.toFixed(0).padStart(4)} | (${p.type})`);
    });

    console.log("\n[2] SECTOR BOXES (Theoretical):");
    const getBox = (ids) => {
        const nodes = ids.map(id => pos[id]).filter(Boolean);
        if (nodes.length === 0) return null;
        return {
            x: Math.min(...nodes.map(p => p.x)) - 60,
            y: Math.min(...nodes.map(p => p.y)) - 60,
            w: (Math.max(...nodes.map(p => p.x)) - Math.min(...nodes.map(p => p.x))) + 140,
            h: (Math.max(...nodes.map(p => p.y)) - Math.min(...nodes.map(p => p.y))) + 120
        };
    };

    const gpuBox = getBox(['workers_hub', 'worker_1', 'worker_2', 'worker_3', 'embedding_server']);
    if (gpuBox) console.log(`  - GPU_CLUSTER          | X: ${gpuBox.x.toFixed(0).padStart(4)} | Y: ${gpuBox.y.toFixed(0).padStart(4)} | W: ${gpuBox.w.toFixed(0).padStart(4)} | H: ${gpuBox.h.toFixed(0).padStart(4)}`);

    const cpuBox = getBox(['mapper_architecture', 'mapper_habits', 'mapper_stack']);
    if (cpuBox) console.log(`  - CPU_MAPPER_CLUSTER   | X: ${cpuBox.x.toFixed(0).padStart(4)} | Y: ${cpuBox.y.toFixed(0).padStart(4)} | W: ${cpuBox.w.toFixed(0).padStart(4)} | H: ${cpuBox.h.toFixed(0).padStart(4)}`);

    generateAsciiMap(pos);

    console.log("\n[3] CONNECTION LISTING:");
    CONNECTIONS.forEach(c => {
        console.log(`  - ${c.from.padEnd(20)} -> ${c.to.padEnd(25)} | TYPE: ${c.type}`);
    });

    console.log("\n[4] LOGIC GATES & PROTECTION:");
    const hub = pos['workers_hub'];
    const mixer = pos['mixing_buffer'];
    if (hub) console.log(`  - CIRCUIT BREAKER AREA | Center: (${hub.x.toFixed(0)}, ${hub.y.toFixed(0)}) | Status: MONITORED`);
    if (mixer) console.log(`  - MIXING GATE AREA     | Center: (${mixer.x.toFixed(0)}, ${mixer.y.toFixed(0)}) | Status: CAP_SENSITIVE`);

    console.log("\n[5] COMPLEX SYSTEM AUDIT:");
    Object.keys(PIPELINE_NODES).forEach(id => {
        const node = PIPELINE_NODES[id];
        if (node.internalClasses && node.internalClasses.length > 0) {
            console.log(`  - ${id.padEnd(20)}: Contiene sistemas complejos: [${node.internalClasses.join(', ')}]`);
        }
    });

    console.log("\n[!] DIAGNOSTIC ADVISORY:");
    console.log("    - Todos los ruteos ahora utilizan estrategia V-H-V (Vertical-Horizontal-Vertical) para evadir sectores.");
    console.log(`    - FEEDBACK LOOP TUNNELING establecido en Y=${1050}.`);
}

runAudit();
