import { DesignerStore } from './DesignerStore.js';

export const ConnectionManager = {
    get connections() {
        return DesignerStore.state.connections;
    },

    /**
     * Add a manual connection
     */
    addConnection(fromId, toId) {
        if (this.connections.some(c => c.from === fromId && c.to === toId)) return false;

        const updatedConnections = [...this.connections, { from: fromId, to: toId }];
        DesignerStore.setState({ connections: updatedConnections });
        return true;
    },

    /**
     * Remove a connection
     */
    removeConnection(fromId, toId) {
        const updatedConnections = this.connections.filter(c => !(c.from === fromId && c.to === toId));
        if (updatedConnections.length !== this.connections.length) {
            DesignerStore.setState({ connections: updatedConnections });
            return true;
        }
        return false;
    },

    /**
     * Set connections (for undo/redo)
     */
    setConnections(connections) {
        DesignerStore.setState({ connections });
    },

    /**
     * Get connections for a specific node
     */
    getConnectionsFor(nodeId) {
        return this.connections.filter(c => c.from === nodeId || c.to === nodeId);
    }
};
