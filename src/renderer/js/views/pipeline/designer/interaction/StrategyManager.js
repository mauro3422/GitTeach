import { DragStrategy } from '../strategies/DragStrategy.js';
import { DrawStrategy } from '../strategies/DrawStrategy.js';

export class StrategyManager {
    constructor(dependencies = {}) {
        this.dependencies = dependencies;
        this.context = dependencies.controller;

        // Instantiate strategies with the main dependency object
        this.dragStrategy = new DragStrategy(dependencies);
        this.drawStrategy = new DrawStrategy(dependencies);

        // Default strategy
        this.activeStrategy = this.dragStrategy;
    }

    setDrawMode() {
        if (this.activeStrategy !== this.drawStrategy) {
            this.cancel();
            this.activeStrategy = this.drawStrategy;
            return true;
        }
        return false;
    }

    setDragMode() {
        if (this.activeStrategy !== this.dragStrategy) {
            this.cancel();
            this.activeStrategy = this.dragStrategy;
            return true;
        }
        return false;
    }

    getActiveStrategy() {
        return this.activeStrategy;
    }

    getCursor() {
        return this.activeStrategy.getCursor();
    }

    cancel() {
        if (this.activeStrategy && this.activeStrategy.cancel) {
            this.activeStrategy.cancel();
        }
    }

    // --- Event Delegation ---

    handleMouseDown(e) {
        if (this.activeStrategy.handleMouseDown) {
            this.activeStrategy.handleMouseDown(e);
        }
    }

    handleMouseMove(e) {
        if (this.activeStrategy.handleMouseMove) {
            this.activeStrategy.handleMouseMove(e);
        }
    }

    handleMouseUp(e) {
        if (this.activeStrategy.handleMouseUp) {
            this.activeStrategy.handleMouseUp(e);
        }
    }

    handleKeyDown(e) {
        if (this.activeStrategy.handleKeyDown) {
            this.activeStrategy.handleKeyDown(e);
        }
    }

    handleKeyUp(e) {
        if (this.activeStrategy.handleKeyUp) {
            this.activeStrategy.handleKeyUp(e);
        }
    }

    // --- State Getters ---

    getDragState() {
        return this.dragStrategy.isActive() ? this.dragStrategy.dragState : null;
    }

    getConnectionState() {
        return this.drawStrategy.isActive() ? this.drawStrategy.connectionState : null;
    }
}
