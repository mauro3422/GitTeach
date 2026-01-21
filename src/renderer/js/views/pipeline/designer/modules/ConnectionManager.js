/**
 * ConnectionManager.js
 * Responsabilidad: Gestión de conexiones manuales entre nodos
 */

export const ConnectionManager = {
    connections: [],

    /**
     * Initialize with existing connections
     */
    init(connections = []) {
        this.connections = connections;
    },

    /**
     * Add a manual connection between two nodes
     */
    addConnection(fromId, toId) {
        // Prevent duplicates
        if (this.connections.some(c => c.from === fromId && c.to === toId)) return false;

        this.connections.push({ from: fromId, to: toId });
        return true;
    },

    /**
     * Remove a connection between two nodes
     */
    removeConnection(fromId, toId) {
        const index = this.connections.findIndex(c => c.from === fromId && c.to === toId);
        if (index !== -1) {
            this.connections.splice(index, 1);
            return true;
        }
        return false;
    },

    /**
     * Get all connections
     */
    getConnections() {
        return [...this.connections];
    },

    /**
     * Get connections for a specific node
     */
    getConnectionsFor(nodeId) {
        return this.connections.filter(c => c.from === nodeId || c.to === nodeId);
    },

    /**
     * Check if a connection can be made (no duplicates, no self-loops)
     */
    canConnect(fromId, toId) {
        if (fromId === toId) return false; // No self-loops
        return !this.connections.some(c => c.from === fromId && c.to === toId);
    },

    /**
     * Clear all connections
     */
    clear() {
        this.connections = [];
    },

    /**
     * Set connections (for undo/redo)
     */
    setConnections(connections) {
        this.connections = [...connections];
    }
};
