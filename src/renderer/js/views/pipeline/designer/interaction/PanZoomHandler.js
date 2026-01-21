/**
 * PanZoomHandler.js
 * Responsabilidad: Gestión de pan, zoom y conversiones de coordenadas
 */

import { CanvasUtils } from '../CanvasUtils.js';
import { AnimationManager } from '../AnimationManager.js';

export const PanZoomHandler = {
    state: {
        panOffset: { x: 0, y: 0 },
        zoomScale: 1.0,
        isPanning: false,
        panStart: null,
        minZoom: 0.3,
        maxZoom: 4.0
    },

    /**
     * Initialize with existing state
     */
    init(state) {
        if (state) {
            this.state.panOffset = state.panOffset || { x: 0, y: 0 };
            this.state.zoomScale = state.zoomScale || 1.0;
            this.state.minZoom = state.minZoom || 0.3;
            this.state.maxZoom = state.maxZoom || 4.0;
        }
    },

    /**
     * Start panning
     */
    startPan(mousePos) {
        this.state.isPanning = true;
        this.state.panStart = { ...mousePos };
    },

    /**
     * Update pan position
     */
    updatePan(mousePos) {
        if (!this.state.isPanning || !this.state.panStart) return;

        const dx = mousePos.x - this.state.panStart.x;
        const dy = mousePos.y - this.state.panStart.y;

        this.state.panOffset.x += dx;
        this.state.panOffset.y += dy;
        this.state.panStart = { ...mousePos };
    },

    /**
     * End panning
     */
    endPan() {
        this.state.isPanning = false;
        this.state.panStart = null;
    },

    /**
     * Handle zoom with mouse wheel
     */
    handleWheel(deltaY, mousePos, onUpdate) {
        const delta = deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = this.state.zoomScale * delta;

        if (nextZoom >= this.state.minZoom && nextZoom <= this.state.maxZoom) {
            // Zoom towards mouse position
            const worldPos = this.screenToWorld(mousePos);
            this.state.zoomScale = nextZoom;

            // Adjust pan to keep mouse position fixed in world space
            const newScreenPos = this.worldToScreen(worldPos);
            this.state.panOffset.x += mousePos.x - newScreenPos.x;
            this.state.panOffset.y += mousePos.y - newScreenPos.y;

            if (onUpdate) onUpdate();
        }
    },

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenPos) {
        return CanvasUtils.screenToWorld(screenPos, this.state);
    },

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldPos) {
        return CanvasUtils.worldToScreen(worldPos, this.state);
    },

    /**
     * Animate pan to target position
     */
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
    },

    /**
     * Center on a specific node
     */
    centerOnNode(node, canvasSize, drawerWidth = 0) {
        const targetX = (canvasSize.width - drawerWidth) / 2;
        const targetY = canvasSize.height / 2;

        const targetPanX = targetX - (node.x * this.state.zoomScale);
        const targetPanY = targetY - (node.y * this.state.zoomScale);

        this.animatePan(targetPanX, targetPanY);
    },

    /**
     * Get current navigation state
     */
    getState() {
        return { ...this.state };
    },

    /**
     * Set navigation state
     */
    setState(newState) {
        Object.assign(this.state, newState);
    }
};
