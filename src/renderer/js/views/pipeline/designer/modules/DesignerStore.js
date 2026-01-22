/**
 * DesignerStore.js
 * Single Source of Truth for the Routing Designer.
 * Centraliza el estado para evitar desincronización entre módulos.
 */

import { Store } from '../../../../core/Store.js';

class DesignerStoreClass extends Store {
    constructor() {
        super({
            nodes: {},
            connections: [],
            navigation: {
                panOffset: { x: 0, y: 0 },
                zoomScale: 1.5
            },
            interaction: {
                mode: 'DRAG', // 'DRAG' | 'DRAW' | 'RESIZE'
                hoveredNodeId: null,
                selectedNodeId: null,
                activeConnection: null, // { fromNode, currentPos }
                draggingNodeId: null,
                resizingNodeId: null
            }
        });
    }

    /**
     * Update state and notify
     * Override to provide specific deep merge logic for this domain
     */
    setState(updates, actionName = 'DESIGNER_UPDATE') {
        // Prepare the next state based on updates
        const nextState = { ...this.state };

        if (updates.nodes) {
            // In-place update approach (legacy compatibility)
            // Ideally we should replace the object, but for now we keep the reference structure
            // logical, but create new object for the store
            nextState.nodes = { ...updates.nodes };
        }

        if (updates.connections) {
            nextState.connections = [...updates.connections];
        }

        if (updates.navigation) {
            nextState.navigation = { ...this.state.navigation, ...updates.navigation };
        }

        if (updates.interaction) {
            nextState.interaction = { ...this.state.interaction, ...updates.interaction };
        }

        // Call parent setState with the fully resolved object
        super.setState(nextState, actionName);
    }

    /**
     * Validation and Cleanup (Issue #5 & #7)
     */
    validateAndCleanup() {
        const state = this.getState();
        const nodeIds = Object.keys(state.nodes);
        let hasChanges = false;

        // 1. Connection integrity
        const newConnections = state.connections.filter(c =>
            nodeIds.includes(c.from) && nodeIds.includes(c.to)
        );

        if (newConnections.length !== state.connections.length) {
            hasChanges = true;
        }

        // 2. Parent integrity
        const newNodes = { ...state.nodes };
        Object.values(newNodes).forEach(node => {
            if (node.parentId && !nodeIds.includes(node.parentId)) {
                console.warn(`[DesignerStore] Removing invalid parentId ${node.parentId} from ${node.id}`);
                node.parentId = null;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.setState({
                connections: newConnections,
                nodes: newNodes
            }, 'VALIDATION_CLEANUP');
        }
    }
}

export const DesignerStore = new DesignerStoreClass();
