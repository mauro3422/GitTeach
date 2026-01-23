/**
 * HistoryManager.js
 * UNIFIED Undo/Redo System for Designer Canvas
 *
 * ARCHITECTURE (2026-01 CONSOLIDATED):
 * This is the SINGLE source of truth for undo/redo.
 * All operations (Commands, Drag, Resize) save state here via DesignerStore.savepoint().
 *
 * Flow:
 * - CommandManager.execute(cmd) → DesignerStore.savepoint() → saves here
 * - DragStrategy.startDrag() → DesignerStore.savepoint() → saves here
 * - ResizeHandler start → DesignerStore.savepoint() → saves here
 * - Ctrl+Z → DesignerStore.undo() → restores from here
 * - Ctrl+Y → DesignerStore.redo() → restores from here
 *
 * This ensures ALL operations are undoable via one unified system.
 */

export const HistoryManager = {
    // Action types for granular undo/redo
    ACTION_TYPES: {
        NODE_CREATE: 'node:create',
        NODE_DELETE: 'node:delete',
        NODE_MOVE: 'node:move',
        NODE_RESIZE: 'node:resize',
        NODE_UPDATE: 'node:update',
        CONNECTION_CREATE: 'connection:create',
        CONNECTION_DELETE: 'connection:delete',
        BULK_UPDATE: 'bulk:update'
    },

    undoStack: [],
    redoStack: [],
    maxSize: 50,
    _isRecording: true,

    /**
     * Enable/disable recording (useful during undo/redo operations)
     */
    setRecording(enabled) {
        this._isRecording = enabled;
    },

    /**
     * Save current state to history (before making changes)
     * @param {Object} nodes - Current nodes state
     * @param {Array} connections - Current connections state
     * @param {string} actionType - Type of action (from ACTION_TYPES)
     * @param {Object} metadata - Additional action info { nodeId, description }
     */
    saveToHistory(nodes, connections, actionType = 'BULK_UPDATE', metadata = {}) {
        if (!this._isRecording) return;

        const snapshot = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            connections: JSON.parse(JSON.stringify(connections)),
            actionType,
            metadata: {
                timestamp: Date.now(),
                ...metadata
            }
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
