// scripts/tools/ultimate_multitier_tracer.mjs
/**
 * ULTIMATE MULTI-TIER TRACER 🧬 - MODULAR ENGINE EDITION
 * Powered by TracerEngine (scripts/tools/tracer/)
 */

import { TracerEngine } from './tracer/index.js';

const engine = new TracerEngine();

engine.run().catch(e => {
    console.error('\n❌ TRACER FAILED:', e);
    process.exit(1);
});
