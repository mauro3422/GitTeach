/**
 * verify_pipeline_integrity.js
 * FORENSIC AUDIT V4 (ESM).
 * Sincronizado con la lógica Direct-First del ruteador.
 */

import { PIPELINE_NODES, CONNECTIONS } from '../src/renderer/js/views/pipeline/PipelineConstants.js';
import { ConnectionRouter } from '../src/renderer/js/views/pipeline/ConnectionRouter.js';

const REF_SCALE = 1200;

function getPositions() {
    const pos = {};
    Object.keys(PIPELINE_NODES).forEach(id => {
        const node = PIPELINE_NODES[id];
        if (node.isSatellite && node.orbitParent) {
            const parent = PIPELINE_NODES[node.orbitParent];
            const radius = (node.orbitRadius || 0.18) * 800;
            const angle = (node.orbitAngle || 0) * (Math.PI / 180);
            pos[id] = { id, x: (parent.x * REF_SCALE) + radius * Math.cos(angle), y: (parent.y * REF_SCALE) + radius * Math.sin(angle) };
        } else {
            pos[id] = { id, x: node.x * REF_SCALE, y: node.y * REF_SCALE };
        }
    });
    return pos;
}

function checkIntersection(p1, p2, center, radius) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false;
    let t = Math.max(0, Math.min(1, ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / lenSq));
    const distSq = (p1.x + t * dx - center.x) ** 2 + (p1.y + t * dy - center.y) ** 2;
    return distSq < (radius * radius);
}

function runAudit() {
    const allPos = getPositions();
    const failures = [];
    const segmentsCoords = {};

    console.log("\n--- FORENSIC AUDIT V4: DIRECT-FIRST VALIDATION ---");

    CONNECTIONS.forEach(conn => {
        const start = allPos[conn.from];
        const end = allPos[conn.to];
        if (!start || !end) return;

        const path = ConnectionRouter.computeRoute(conn.from, conn.to, start, end, conn.type, allPos);

        // Audit VISIBLE segments only (from pin to pin)
        for (let i = 1; i < path.length - 2; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];

            // 1. Overlap detection (High precision)
            const k = `${p1.x.toFixed(2)},${p1.y.toFixed(2)}->${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
            const rk = `${p2.x.toFixed(2)},${p2.y.toFixed(2)}->${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;

            if (segmentsCoords[k] || segmentsCoords[rk]) {
                failures.push({ route: `${conn.from}->${conn.to}`, by: segmentsCoords[k] || segmentsCoords[rk], type: 'OVERLAP' });
            }
            segmentsCoords[k] = `${conn.from}->${conn.to}`;

            // 2. Node Pierce
            Object.keys(allPos).forEach(id => {
                if (id === conn.from || id === conn.to) return;
                const config = PIPELINE_NODES[id];
                const pad = config?.internalClasses?.length > 0 ? 105 : 75;
                if (checkIntersection(p1, p2, allPos[id], pad)) {
                    failures.push({ route: `${conn.from}->${conn.to}`, by: id, type: 'PIERCE' });
                }
            });
        }
    });

    if (failures.length > 0) {
        console.error(`FAILED: ${failures.length} issues found.`);
        const unique = []; const seen = new Set();
        failures.forEach(f => {
            const k = `${f.route}_${f.by}_${f.type}`;
            if (!seen.has(k)) { unique.push(f); seen.add(k); }
        });
        unique.forEach(f => console.log(` [${f.type.padEnd(8)}] ${f.route.padEnd(25)} | WITH: ${f.by}`));
    } else {
        console.log("PASSED: All routes are clean and direct.");
    }
}

runAudit();
