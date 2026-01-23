
import { InteractionHandler } from '../InteractionHandler.js';
import { CoordinateUtils } from '../CoordinateUtils.js';
import { AnimationManager } from '../AnimationManager.js';

export class PanZoomHandler extends InteractionHandler {

    constructor(controller) {
        super(controller);
        this.state = {
            panOffset: { x: 0, y: 0 },
            zoomScale: 1.0,
            isPanning: false,
            panStart: null,
            minZoom: 0.3,
            maxZoom: 4.0
        };
        // Throttle state for wheel events
        this.lastWheelTime = 0;
        this.wheelThrottleMs = 16; // ~60fps max
    }

    init(config) {
        if (config) {
            if (config.panOffset) this.state.panOffset = config.panOffset;
            if (config.zoomScale) this.state.zoomScale = config.zoomScale;
        }
    }

    // --- InteractionHandler Implementation ---

    onStart(e, context) {
        // Context might contain initial mouse pos
        const rawPos = context && context.rawPos ? context.rawPos : this.controller.getMousePos(e);

        this.setState({
            isPanning: true,
            panStart: { ...rawPos }
        });

        // Use setCursor if available on controller, or set directly
        if (this.controller.canvas) {
            this.controller.canvas.style.cursor = 'grabbing';
        }
    }

    onUpdate(e) {
        const state = this.getState();
        if (!state.isPanning || !state.panStart) return;

        const rawPos = this.controller.getMousePos(e);
        const dx = rawPos.x - state.panStart.x;
        const dy = rawPos.y - state.panStart.y;

        this.state.panOffset.x += dx;
        this.state.panOffset.y += dy;
        this.state.panStart = { ...rawPos };
    }

    onEnd(e) {
        this.setState({
            isPanning: false,
            panStart: null
        });
        if (this.controller.canvas) {
            this.controller.canvas.style.cursor = 'default'; // Or restore previous
        }
    }

    onCancel() {
        this.onEnd();
    }

    // --- Specialized Methods ---

    /**
     * Centralized zoom setter - always use this to change zoom
     * @param {number} newZoom - Target zoom level
     * @param {Object} mousePos - Optional mouse position for zoom-to-point
     * @param {Function} onUpdate - Optional callback after zoom change
     * @returns {number} The clamped zoom value
     */
    setZoom(newZoom, mousePos = null, onUpdate = null) {
        const clamped = Math.max(this.state.minZoom, Math.min(this.state.maxZoom, newZoom));

        if (mousePos) {
            // Zoom towards mouse position
            const worldPos = CoordinateUtils.screenToWorld(mousePos, this.state);
            this.state.zoomScale = clamped;

            // Adjust pan to keep mouse position steady
            const newScreenPos = CoordinateUtils.worldToScreen(worldPos, this.state);
            this.state.panOffset.x += mousePos.x - newScreenPos.x;
            this.state.panOffset.y += mousePos.y - newScreenPos.y;
        } else {
            // Simple zoom without panning
            this.state.zoomScale = clamped;
        }

        if (onUpdate) onUpdate();
        return clamped;
    }

    handleWheel(e, onUpdate) {
        // PERF: Throttle wheel events to prevent render spam
        const now = performance.now();
        if (now - this.lastWheelTime < this.wheelThrottleMs) {
            return; // Skip this wheel event
        }
        this.lastWheelTime = now;

        const deltaY = e.deltaY;
        const mousePos = this.controller.getMousePos(e);

        const delta = deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = this.state.zoomScale * delta;

        // Use centralized setZoom method
        this.setZoom(nextZoom, mousePos, onUpdate);
    }

    /**
     * Center camera on a specific node
     * Uses inverse of worldToScreen formula: panOffset = screenPos - worldPos * zoom
     */
    centerOnNode(node, canvasSize, drawerWidth = 0) {
        // Target screen position (center of visible canvas)
        const targetScreenX = (canvasSize.width - drawerWidth) / 2;
        const targetScreenY = canvasSize.height / 2;

        // Calculate panOffset needed to place node.x,y at target screen position
        // From: screenPos = worldPos * zoom + panOffset
        // Solve: panOffset = screenPos - worldPos * zoom
        const targetPanX = targetScreenX - (node.x * this.state.zoomScale);
        const targetPanY = targetScreenY - (node.y * this.state.zoomScale);

        this.animatePan(targetPanX, targetPanY, () => {
            if (this.controller.onUpdate) this.controller.onUpdate();
        });
    }

    animatePan(targetX, targetY, onUpdate) {
        const startX = this.state.panOffset.x;
        const startY = this.state.panOffset.y;
        const duration = 400; // ms
        const startTime = performance.now();

        AnimationManager.registerTween({
            id: 'pan-animation',
            animate: () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing: easeOutCubic
                const ease = 1 - Math.pow(1 - progress, 3);

                this.state.panOffset.x = startX + (targetX - startX) * ease;
                this.state.panOffset.y = startY + (targetY - startY) * ease;

                if (onUpdate) onUpdate();

                if (progress >= 1) {
                    AnimationManager.unregisterTween({ id: 'pan-animation' });
                }
            }
        });
    }
}
