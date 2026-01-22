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

// Add lifecycle methods for debugger panel management
TracerView.mountDebuggerPanel = () => TracerController.mountDebuggerPanel();
TracerView.unmountDebuggerPanel = () => TracerController.unmountDebuggerPanel();

// Start the modular system
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TracerController.init());
} else {
    TracerController.init();
}
