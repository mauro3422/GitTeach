/**
 * TracerView.js - MODULAR VERSION
 * Legacy wrapper for backwards compatibility.
 * Now delegates to the modular TracerController system.
 */

import { TracerController } from './tracer/TracerController.js';

// Enable tracer flags
window.IS_TRACER = true;
window.FORCE_REAL_AI = true;

// Backwards compatibility: expose TracerView as alias to TracerController
export const TracerView = TracerController;

// Start the modular system
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TracerController.init());
} else {
    TracerController.init();
}
