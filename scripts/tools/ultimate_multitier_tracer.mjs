// scripts/tools/ultimate_multitier_tracer.mjs
/**
 * ULTIMATE MULTI-TIER TRACER 🧬 - MODULAR ENGINE EDITION
 * Powered by TracerEngine (scripts/tools/tracer/)
 */

import { TracerEngine } from './tracer/index.js';

const engine = new TracerEngine();

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n💥 UNHANDLED REJECTION:', reason);
    // Do not exit immediately, let the engine try to save what it can
});

process.on('uncaughtException', (error) => {
    console.error('\n💥 UNCAUGHT EXCEPTION:', error);
    process.exit(1);
});

engine.run().catch(e => {
    console.error('\n❌ TRACER FAILED FATALLY:', e);
    process.exit(1);
});
