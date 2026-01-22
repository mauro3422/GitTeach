/**
 * InteractionHandler.js
 * Base class for specialized interaction modules (Resize, PanZoom, etc.)
 * Provides a common bridge between the controller and specific logic
 */
export class InteractionHandler {
    constructor(controller) {
        this.controller = controller;
        this.state = {};
        this._active = false;
    }

    // --- Lifecycle hooks intended to be overridden by subclasses ---

    init(config) { }

    onStart(e, context) { }

    onUpdate(e) { }

    onEnd(e) { }

    onCancel() { }

    // --- State management helpers ---

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this._active = true;
    }

    getState() {
        return this.state;
    }

    clearState() {
        this.state = {};
        this._active = false;
    }

    isActive() {
        return this._active;
    }

    /**
     * Entry points called by the controller
     */
    start(e, context = {}) {
        this.onStart(e, context);
    }

    update(e) {
        if (this._active) {
            this.onUpdate(e);
        }
    }

    end(e) {
        if (this._active) {
            this.onEnd(e);
            this._active = false; // Just deactivate, don't wipe state
        }
    }

    cancel() {
        if (this._active) {
            this.onCancel();
            this._active = false; // Just deactivate
        }
    }
}
