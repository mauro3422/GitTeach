/**
 * DrawStrategy.js
 * Strategy for drawing connections between nodes
 * Implements connection creation logic extracted from ConnectionHandler
 */

import { InteractionStrategy } from './InteractionStrategy.js';
import { interactionState } from '../modules/stores/InteractionState.js';

export class DrawStrategy extends InteractionStrategy {
    constructor(controller) {
        super(controller);
        this.connectionState = {
            fromNode: null,
            currentPos: null
        };
    }

    /**
     * Handle mouse down for connection initiation
     * @param {MouseEvent} e - Mouse event
     * @param {Object} context - Context with clicked node info
     */
    handleMouseDown(e, context = {}) {
        const worldPos = this.controller.getWorldPosFromEvent(e);

        // Only handle left clicks
        if (e.button === 0) {
            const clickedNodeId = this.controller.hoveredNodeId;
            const clickedNode = clickedNodeId ? this.controller.nodes[clickedNodeId] : null;

            if (clickedNode && !clickedNode.isRepoContainer && !clickedNode.isStickyNote) {
                this.handleConnectionClick(clickedNode, worldPos);
                this.controller.onUpdate?.();
            }
        }
    }

    /**
     * Handle mouse move for connection preview
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        // Only update preview if active
        if (this.isActive()) {
            const worldPos = this.controller.getWorldPosFromEvent(e);
            this.connectionState.currentPos = { ...worldPos };
            this.controller.onUpdate?.();
        }
    }

    /**
     * Handle mouse up for connection completion
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        // Connection logic is handled in mouse down (click-based)
        if (this.controller.onInteractionEnd) {
            this.controller.onInteractionEnd();
        }
    }

    /**
     * Handle key down for connection cancellation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.cancel();
            this.controller.onUpdate?.();
        }
    }

    /**
     * Get cursor style for draw strategy
     * @returns {string}
     */
    getCursor() {
        return 'crosshair';
    }

    /**
     * Check if connection drawing is active
     * @returns {boolean}
     */
    isActive() {
        return this.connectionState.fromNode !== null;
    }

    /**
     * Cancel current connection
     */
    cancel() {
        this.connectionState.fromNode = null;
        this.connectionState.currentPos = null;
        interactionState.setDrawing(null);
        console.log('[DrawStrategy] Connection cancelled');
    }

    /**
     * Handle click for connection creation/modification
     * @param {Object} clickedNode - Node that was clicked
     * @param {Object} worldPos - World position of click
     */
    handleConnectionClick(clickedNode, worldPos) {
        if (this.isActive()) {
            // Finish connection
            const fromNode = this.connectionState.fromNode;
            if (clickedNode && clickedNode.id !== fromNode.id) {
                if (this.controller.onConnection) {
                    this.controller.onConnection(fromNode.id, clickedNode.id);
                }
            }
            this.cancel();
        } else {
            // Start connection
            this.connectionState.fromNode = clickedNode;
            this.connectionState.currentPos = { ...worldPos };
            interactionState.setDrawing(clickedNode.id);
            console.log(`[DrawStrategy] Started connection from: ${clickedNode.id}`);
        }
    }

    /**
     * Get current connection state for rendering
     * @returns {Object|null} Connection state or null
     */
    getConnectionState() {
        if (!this.isActive()) return null;

        return {
            fromNode: this.connectionState.fromNode,
            currentPos: this.connectionState.currentPos
        };
    }
}
