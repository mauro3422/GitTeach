/**
 * test_router_atomic.mjs
 * ESM compatible version for Windows.
 */
import { pathToFileURL } from 'url';
import path from 'path';

const constantsPath = pathToFileURL(path.resolve('src/renderer/js/views/pipeline/PipelineConstants.js')).href;
const routerPath = pathToFileURL(path.resolve('src/renderer/js/views/pipeline/ConnectionRouter.js')).href;

const { PIPELINE_NODES } = await import(constantsPath);
const { ConnectionRouter } = await import(routerPath);

const REF_SCALE = 1200;

function getPos(id) {
    const n = PIPELINE_NODES[id];
    if (!n) return null;
    return { x: n.x * REF_SCALE, y: n.y * REF_SCALE };
}

function testPair(from, to) {
    console.log(`\n--- TESTING PAIR: ${from} -> ${to} ---`);
    const start = getPos(from);
    const end = getPos(to);

    if (!start || !end) {
        console.error(`Error: Node ${!start ? from : to} not found.`);
        return;
    }

    const allPos = {};
    Object.keys(PIPELINE_NODES).forEach(id => {
        allPos[id] = getPos(id);
    });

    const route = ConnectionRouter.computeRoute(from, to, start, end, 'DATA_FLOW', allPos);

    console.log(`Path length: ${route.length} points`);
    route.forEach((p, i) => {
        console.log(`  [${i}] x: ${p.x.toFixed(1)}, y: ${p.y.toFixed(1)}`);
    });

    if (route.length === 4) console.log("Result: DIRECT LINE (With start/end padding)");
    else if (route.length === 5) console.log("Result: SIMPLE L-SHAPE / MANHATTAN");
    else console.log(`Result: COMPLEX ROUTE (${route.length} steps) - Check for overhead.`);
}

const args = process.argv.slice(2);
if (args.length >= 2) {
    testPair(args[0], args[1]);
} else {
    testPair('github', 'api_fetch');
    testPair('intelligence', 'radar_adopt');
}
