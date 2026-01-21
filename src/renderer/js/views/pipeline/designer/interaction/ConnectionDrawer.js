/**
 * ConnectionDrawer.js
 * Responsabilidad: Gestión del dibujo de conexiones manuales entre nodos
 */

export const ConnectionDrawer = {
    activeConnection: null,

    /**
     * Initialize with canvas context
     */
    init(ctx) {
        this.ctx = ctx;
    },

    /**
     * Start drawing a connection from a node
     */
    startConnection(fromNode, mousePos) {
        this.activeConnection = {
            fromNode: fromNode,
            currentPos: { ...mousePos }
        };
    },

    /**
     * Update the current connection position
     */
    updateConnection(mousePos) {
        if (this.activeConnection) {
            this.activeConnection.currentPos = { ...mousePos };
        }
    },

    /**
     * Finish the connection to a target node
     */
    finishConnection(toNode, onConnection) {
        if (!this.activeConnection || !toNode) {
            this.cancelConnection();
            return;
        }

        const fromNode = this.activeConnection.fromNode;

        // Don't connect to self
        if (fromNode.id === toNode.id) {
            this.cancelConnection();
            return;
        }

        // Call the connection callback
        if (onConnection) {
            onConnection(fromNode.id, toNode.id);
        }

        this.activeConnection = null;
    },

    /**
     * Cancel the current connection
     */
    cancelConnection() {
        this.activeConnection = null;
    },

    /**
     * Check if currently drawing a connection
     */
    isDrawing() {
        return this.activeConnection !== null;
    },

    /**
     * Draw the active connection line
     */
    drawActiveLine(designerCanvas, navState) {
        if (!this.activeConnection) return;

        const fromNode = this.activeConnection.fromNode;
        const currentPos = this.activeConnection.currentPos;

        designerCanvas.drawActiveLine(fromNode, currentPos, navState);
    },

    /**
     * Handle mouse click for connection drawing
     */
    handleClick(mousePos, clickedNode, onConnection) {
        if (!clickedNode) {
            this.cancelConnection();
            return;
        }

        if (this.activeConnection) {
            // Finish connection
            this.finishConnection(clickedNode, onConnection);
        } else {
            // Start new connection
            this.startConnection(clickedNode, mousePos);
        }
    }
};
