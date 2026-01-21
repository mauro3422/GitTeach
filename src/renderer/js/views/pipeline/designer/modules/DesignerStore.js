/**
 * DesignerStore.js
 * Single Source of Truth for the Routing Designer.
 * Centraliza el estado para evitar desincronización entre módulos.
 */

export const DesignerStore = {
    state: {
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
    },

    listeners: [],

    /**
     * Subscribe to state changes
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },

    /**
     * Notify all listeners of changes
     */
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    },

    /**
     * Update state and notify
     */
    setState(updates) {
        // Deep merge logic simplified for this scope
        if (updates.nodes) {
            // In-place update to preserve references if needed (though store pattern discourages it)
            Object.keys(this.state.nodes).forEach(key => delete this.state.nodes[key]);
            Object.assign(this.state.nodes, JSON.parse(JSON.stringify(updates.nodes)));
        }

        if (updates.connections) {
            this.state.connections = [...updates.connections];
        }

        if (updates.navigation) {
            this.state.navigation = { ...this.state.navigation, ...updates.navigation };
        }

        if (updates.interaction) {
            this.state.interaction = { ...this.state.interaction, ...updates.interaction };
        }

        this.notify();
    },

    /**
     * Validation and Cleanup (Issue #5 & #7)
     */
    validateAndCleanup() {
        const nodeIds = Object.keys(this.state.nodes);

        // 1. Connection integrity (remove connections to non-existent nodes)
        this.state.connections = this.state.connections.filter(c =>
            nodeIds.includes(c.from) && nodeIds.includes(c.to)
        );

        // 2. Parent integrity (remove parentId if parent doesn't exist)
        Object.values(this.state.nodes).forEach(node => {
            if (node.parentId && !nodeIds.includes(node.parentId)) {
                console.warn(`[DesignerStore] Removing invalid parentId ${node.parentId} from ${node.id}`);
                node.parentId = null;
            }

            // 3. Property Cleanup (Issue #5)
            // Remove temporary animation/interaction properties before long-term storage
            // This is handled during serialization by the store getters if needed
        });
    }
};
