/**
 * HistoryManager.js
 * Responsabilidad: Gestión del historial de undo/redo
 */

export const HistoryManager = {
    undoStack: [],
    redoStack: [],
    maxSize: 50,

    /**
     * Save current state to history (before making changes)
     */
    saveToHistory(nodes, connections) {
        const snapshot = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            connections: JSON.parse(JSON.stringify(connections))
        };
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
    },

    /**
     * Undo the last action
     */
    undo(nodes, connections) {
        if (this.undoStack.length === 0) return null;

        // Save current state to redo stack
        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            connections: JSON.parse(JSON.stringify(connections))
        };
        this.redoStack.push(currentState);

        // Restore previous state
        const prevState = this.undoStack.pop();
        return prevState;
    },

    /**
     * Redo the last undone action
     */
    redo(nodes, connections) {
        if (this.redoStack.length === 0) return null;

        // Save current state to undo stack
        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            connections: JSON.parse(JSON.stringify(connections))
        };
        this.undoStack.push(currentState);

        // Restore redo state
        const redoState = this.redoStack.pop();
        return redoState;
    },

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.undoStack.length > 0;
    },

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.redoStack.length > 0;
    },

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
};
