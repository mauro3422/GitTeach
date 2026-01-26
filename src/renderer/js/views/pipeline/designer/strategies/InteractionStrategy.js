/**
 * InteractionStrategy.js
 * Abstract base class for interaction strategies
 * Implements Strategy Pattern for different interaction modes
 */

export class InteractionStrategy {
    constructor(dependencies = {}) {
        this.dependencies = dependencies;
        this.controller = dependencies.controller;
        this.nodeRepository = dependencies.nodeRepository;
        this.interactionState = dependencies.interactionState;
        this.cameraState = dependencies.cameraState;

        if (this.constructor === InteractionStrategy) {
            throw new Error('InteractionStrategy is abstract and cannot be instantiated directly');
        }
    }

    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     * @param {Object} context - Additional context
     */
    handleMouseDown(e, context = {}) {
        throw new Error('handleMouseDown must be implemented by subclass');
    }

    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        // Default implementation - can be overridden
    }

    /**
     * Handle mouse up event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        // Default implementation - can be overridden
    }

    /**
     * Handle double click event
     * @param {MouseEvent} e - Mouse event
     */
    handleDoubleClick(e) {
        // Default implementation - delegate to controller
        this.controller.handleDoubleClick(e);
    }

    /**
     * Handle wheel event
     * @param {WheelEvent} e - Wheel event
     */
    handleWheel(e) {
        // Default implementation - delegate to controller
        this.controller.handleWheel(e);
    }

    /**
     * Handle resize event
     */
    handleResize() {
        // Default implementation - delegate to controller
        this.controller.handleResize();
    }

    /**
     * Handle key down event
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        // Default implementation - no action
    }

    /**
     * Handle key up event
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyUp(e) {
        // Default implementation - no action
    }

    /**
     * Get cursor style for current strategy
     * @returns {string} CSS cursor value
     */
    getCursor() {
        return 'default';
    }

    /**
     * Check if strategy is active/engaged
     * @returns {boolean}
     */
    isActive() {
        return false;
    }

    /**
     * Cancel current interaction
     */
    cancel() {
        // Default implementation - no action
    }

    /**
     * Clean up strategy state
     */
    cleanup() {
        // Default implementation - no action
    }
}
