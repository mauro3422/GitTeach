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

    // Memory management
    maxSize: 50,  // Already exists
    maxMemoryMB: 10,  // NEW: 10MB limit for history
    _currentMemoryUsage: 0,  // NEW: Track memory

    _isRecording: true,

    /**
     * Enable/disable recording (useful during undo/redo operations)
     */
    setRecording(enabled) {
        this._isRecording = enabled;
    },

    /**
     * Estimate memory usage of a snapshot
     */
    _estimateMemoryUsage(nodes, connections) {
        // Rough estimate: JSON size in bytes
        const nodesJson = JSON.stringify(nodes);
        const connectionsJson = JSON.stringify(connections);
        const estimatedBytes = nodesJson.length + connectionsJson.length;
        return estimatedBytes / (1024 * 1024);  // Convert to MB
    },

    /**
     * Check if we can add another snapshot without exceeding limits
     */
    _canAddSnapshot(nodes, connections) {
        const estimatedSize = this._estimateMemoryUsage(nodes, connections);

        // Check both limits
        if (this.undoStack.length >= this.maxSize) {
            console.warn(`[HistoryManager] Max history size (${this.maxSize}) reached`);
            return false;
        }

        if (this._currentMemoryUsage + estimatedSize > this.maxMemoryMB) {
            console.warn(`[HistoryManager] Memory limit (${this.maxMemoryMB}MB) would be exceeded`);
            console.warn(`[HistoryManager] Current: ${this._currentMemoryUsage.toFixed(2)}MB + ${estimatedSize.toFixed(2)}MB`);
            return false;
        }

        return true;
    },

    /**
     * Remove oldest snapshot to make space
     */
    _removeOldest() {
        if (this.undoStack.length === 0) return;

        const removed = this.undoStack.shift();
        const removedSize = this._estimateMemoryUsage(removed.nodes, removed.connections);
        this._currentMemoryUsage -= removedSize;

        console.log(`[HistoryManager] Removed oldest snapshot, freed ${removedSize.toFixed(2)}MB`);
    },

    /**
     * Save snapshot to history (MODIFIED)
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

        const snapshotSize = this._estimateMemoryUsage(nodes, connections);

        // Keep removing old entries until we have space
        while (!this._canAddSnapshot(nodes, connections)) {
            this._removeOldest();
        }

        this.undoStack.push(snapshot);
        this._currentMemoryUsage += snapshotSize;

        // Clear redo stack
        this.redoStack = [];

        // Log memory status
        console.log(`[HistoryManager] Saved snapshot (${snapshotSize.toFixed(2)}MB), total: ${this._currentMemoryUsage.toFixed(2)}MB /
${this.maxMemoryMB}MB`);
    },

    /**
     * Undo (MODIFIED to track memory)
     */
    undo(nodes, connections) {
        if (this.undoStack.length === 0) return null;

        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            connections: JSON.parse(JSON.stringify(connections))
        };

        const currentSize = this._estimateMemoryUsage(nodes, connections);
        this.redoStack.push(currentState);

        const prevState = this.undoStack.pop();
        const prevSize = this._estimateMemoryUsage(prevState.nodes, prevState.connections);

        // Update memory tracking
        this._currentMemoryUsage -= prevSize;
        this._currentMemoryUsage += currentSize;

        return prevState;
    },

    /**
     * Redo (MODIFIED to track memory)
     */
    redo(nodes, connections) {
        if (this.redoStack.length === 0) return null;

        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            connections: JSON.parse(JSON.stringify(connections))
        };

        const currentSize = this._estimateMemoryUsage(nodes, connections);

        const nextState = this.redoStack.pop();
        const nextSize = this._estimateMemoryUsage(nextState.nodes, nextState.connections);

        // Save current to undo for proper undo/redo chain
        this.undoStack.push(currentState);

        // Update memory tracking
        this._currentMemoryUsage -= nextSize;
        this._currentMemoryUsage += currentSize;

        return nextState;
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
     * Clear all history (useful for testing or cleanup)
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this._currentMemoryUsage = 0;
        console.log('[HistoryManager] History cleared');
    },

    /**
     * Get memory statistics
     */
    getMemoryStats() {
        return {
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length,
            currentMemoryMB: this._currentMemoryUsage.toFixed(2),
            maxMemoryMB: this.maxMemoryMB,
            percentageUsed: ((this._currentMemoryUsage / this.maxMemoryMB) * 100).toFixed(1)
        };
    }
};
