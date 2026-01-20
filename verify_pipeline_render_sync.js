/**
 * verify_pipeline_render_sync.js
 * Programmatic check to ensure PipelineCanvas and PipelineRenderer are API-compatible.
 */

const PipelineCanvas = require('./src/renderer/js/views/PipelineCanvas.js').PipelineCanvas;
const PipelineRenderer = require('./src/renderer/js/views/pipeline/PipelineRenderer.js').PipelineRenderer;

function verify() {
    console.log("--- Pipeline Render Synchronization Audit ---");

    const requiredMethods = [
        'prepare',
        'clear',
        'drawConnections',
        'drawParticles',
        'drawTravelingPackages',
        'drawSelectionGlow',
        'drawNodes',
        'drawTooltip'
    ];

    let errors = 0;

    requiredMethods.forEach(method => {
        if (typeof PipelineRenderer[method] !== 'function') {
            console.error(`❌ [ERROR] PipelineRenderer is missing method: ${method}`);
            errors++;
        } else {
            console.log(`✅ [OK] PipelineRenderer contains: ${method}`);
        }
    });

    // Check PipelineCanvas call site
    const canvasDrawStr = PipelineCanvas.draw.toString();
    if (!canvasDrawStr.includes('PipelineRenderer.prepare')) {
        console.warn(`⚠️ [WARN] PipelineCanvas.draw() does not call PipelineRenderer.prepare(). Physics might not update.`);
    }

    if (errors === 0) {
        console.log("\n✨ Audit complete: No fatal mismatches found.");
    } else {
        console.log(`\n🚨 Audit failed with ${errors} errors.`);
    }
}

// Mock browser globals for Node.js execution
global.requestAnimationFrame = () => { };
global.document = { getElementById: () => ({ addEventListener: () => { } }) };
global.window = { addEventListener: () => { } };

try {
    verify();
} catch (e) {
    console.error("FATAL: Audit script crashed:", e.message);
}
