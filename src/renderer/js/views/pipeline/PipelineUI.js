/**
 * PipelineUI.js
 * Simple facade for Pipeline UI components
 * Delegates to specialized managers following SRP
 */

import { drawerManager } from './DrawerManager.js';

export const PipelineUI = {
    /**
     * Show the inspection drawer for a specific node
     */
    showDrawer(container, selectedNode, nodeStats, nodeHistory, nodeStates, onClose) {
        drawerManager.show(container);
        drawerManager.updateDrawer(selectedNode, nodeStats, nodeHistory, nodeStates, onClose);
    },

    /**
     * Update drawer content
     */
    updateDrawer(selectedNode, nodeStats, nodeHistory, nodeStates, onClose) {
        drawerManager.updateDrawer(selectedNode, nodeStats, nodeHistory, nodeStates, onClose);
    },

    /**
     * Close the inspection drawer
     */
    closeDrawer() {
        drawerManager.close();
    }
};
