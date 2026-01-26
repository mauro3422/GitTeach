/**
 * InteractionState.js
 * Single responsibility: User interaction state
 *
 * Tracks: hover, selection, dragging, resizing, drawing modes
 * Extracted from DesignerStore to reduce coupling
 */

import { Store } from '../../../../../core/Store.js';

class InteractionStateClass extends Store {
    constructor() {
        super({
            hoveredNodeId: null,
            selectedNodeId: null,
            selectedConnectionId: null,
            draggingNodeId: null,
            resizingNodeId: null,
            activeMode: 'IDLE', // IDLE, DRAG, RESIZE, DRAW, PAN

            // Resize state (Single Source of Truth)
            resize: {
                corner: null,              // nw, ne, sw, se
                startMouse: null,          // { x, y } in world coords
                startPos: null,            // { x, y } initial center of node
                startLogicalSize: null,    // { w, h } logical dimensions
                startVisualSize: null,     // { w, h } visual dimensions
                childPositions: null       // { nodeId: { relX, relY } }
            }
        });
    }

    // ============ HOVER ============

    /**
     * Set hovered node
     * @param {string|null} nodeId
     */
    setHover(nodeId) {
        if (this.state.hoveredNodeId === nodeId) return; // No change
        this.setInteractionState({ hoveredNodeId: nodeId });
    }

    /**
     * Get currently hovered node ID
     * @returns {string|null}
     */
    getHoveredNodeId() {
        return this.state.hoveredNodeId;
    }

    /**
     * Clear hover
     */
    clearHover() {
        this.setInteractionState({ hoveredNodeId: null });
    }

    // ============ SELECTION ============

    /**
     * Select a node
     * @param {string|null} nodeId
     */
    selectNode(nodeId) {
        if (this.state.selectedNodeId === nodeId) return;
        this.setInteractionState({
            selectedNodeId: nodeId,
            selectedConnectionId: null // Clear connection selection
        });
    }

    /**
     * Get selected node ID
     * @returns {string|null}
     */
    getSelectedNodeId() {
        return this.state.selectedNodeId;
    }

    /**
     * Select a connection
     * @param {string|null} connectionId
     */
    selectConnection(connectionId) {
        if (this.state.selectedConnectionId === connectionId) return;
        this.setInteractionState({
            selectedConnectionId: connectionId,
            selectedNodeId: null // Clear node selection
        });
    }

    /**
     * Get selected connection ID
     * @returns {string|null}
     */
    getSelectedConnectionId() {
        return this.state.selectedConnectionId;
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.setInteractionState({
            selectedNodeId: null,
            selectedConnectionId: null
        });
    }

    // ============ DRAGGING ============

    /**
     * Set dragging node
     * @param {string|null} nodeId
     */
    setDragging(nodeId) {
        this.setInteractionState({
            draggingNodeId: nodeId,
            activeMode: nodeId ? 'DRAG' : 'IDLE'
        });
    }

    /**
     * Get dragging node ID
     * @returns {string|null}
     */
    getDraggingNodeId() {
        return this.state.draggingNodeId;
    }

    /**
     * Check if any node is being dragged
     * @returns {boolean}
     */
    isDragging() {
        return this.state.draggingNodeId !== null;
    }

    // ============ RESIZING ============

    /**
     * Start resize operation with full state
     * @param {string} nodeId
     * @param {Object} resizeState
     */
    startResize(nodeId, resizeState) {
        this.setInteractionState({
            resizingNodeId: nodeId,
            activeMode: 'RESIZE',
            resize: {
                corner: resizeState.corner,
                startMouse: { ...resizeState.startMouse },
                startPos: { ...resizeState.startPos },
                startLogicalSize: { ...resizeState.startLogicalSize },
                startVisualSize: { ...resizeState.startVisualSize },
                childPositions: resizeState.childPositions ? { ...resizeState.childPositions } : null
            }
        });
    }

    /**
     * Get resizing node ID
     * @returns {string|null}
     */
    getResizingNodeId() {
        return this.state.resizingNodeId;
    }

    /**
     * Get resize state
     * @returns {Object}
     */
    getResizeState() {
        return this.state.resize;
    }

    /**
     * Clear resize state
     */
    clearResize() {
        this.setInteractionState({
            resizingNodeId: null,
            activeMode: 'IDLE',
            resize: {
                corner: null,
                startMouse: null,
                startPos: null,
                startLogicalSize: null,
                startVisualSize: null,
                childPositions: null
            }
        });
    }

    /**
     * Check if any resize is active
     * @returns {boolean}
     */
    isResizing() {
        return this.state.resizingNodeId !== null;
    }

    // ============ DRAWING ============

    /**
     * Set drawing/connection mode
     * @param {string|null} sourceNodeId
     */
    setDrawing(sourceNodeId) {
        this.setInteractionState({
            activeMode: sourceNodeId ? 'DRAW' : 'IDLE'
        });
    }

    /**
     * Check if in drawing mode
     * @returns {boolean}
     */
    isDrawing() {
        return this.state.activeMode === 'DRAW';
    }

    // ============ MODES ============

    /**
     * Get active interaction mode
     * @returns {string}
     */
    getActiveMode() {
        return this.state.activeMode;
    }

    /**
     * Cancel all active interactions
     * Emergency reset for Escape key or errors
     */
    cancelAllInteractions() {
        this.setInteractionState({
            draggingNodeId: null,
            resizingNodeId: null,
            activeMode: 'IDLE',
            resize: {
                corner: null,
                startMouse: null,
                startPos: null,
                startLogicalSize: null,
                startVisualSize: null,
                childPositions: null
            }
        });
    }

    // ============ INTERNAL ============

    /**
     * CRITICAL: Validate state before applying
     * Prevents invalid mode combinations
     * @private
     */
    setInteractionState(partial) {
        // Validate: Only ONE active mode at a time
        const newState = { ...this.state, ...partial };
        const activeCount = [
            newState.draggingNodeId !== null,
            newState.resizingNodeId !== null,
            newState.activeMode === 'DRAW'
        ].filter(Boolean).length;

        if (activeCount > 1) {
            console.warn('[InteractionState] Multiple active modes detected, sanitizing...');
            // Default to IDLE if multiple
            newState.activeMode = 'IDLE';
            newState.draggingNodeId = partial.draggingNodeId ?? null;
            newState.resizingNodeId = partial.resizingNodeId ?? null;
        }

        this.setState(newState, 'INTERACTION_STATE_UPDATE');
    }

    /**
     * Get all interaction state as snapshot
     * @returns {Object}
     */
    getState() {
        return {
            hoveredNodeId: this.state.hoveredNodeId,
            selectedNodeId: this.state.selectedNodeId,
            selectedConnectionId: this.state.selectedConnectionId,
            draggingNodeId: this.state.draggingNodeId,
            resizingNodeId: this.state.resizingNodeId,
            activeMode: this.state.activeMode,
            resize: { ...this.state.resize }
        };
    }
}

export const interactionState = new InteractionStateClass();
