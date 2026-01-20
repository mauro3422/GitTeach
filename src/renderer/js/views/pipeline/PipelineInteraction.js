/**
 * PipelineInteraction.js
 * Logic for user interactions with the Pipeline Visualizer.
 * Handles mouse tracking, panning, and hit detection.
 */

import { PIPELINE_NODES } from './PipelineConstants.js';
import { LayoutEngine } from './LayoutEngine.js';

export const PipelineInteraction = {
    /**
     * Mouse tracking and panning state
     */
    state: {
        mousePos: { x: 0, y: 0 },
        isPanning: false,
        lastPanPos: { x: 0, y: 0 },
        panOffset: { x: 0, y: 0 },
        zoomScale: 1.0,
        minZoom: 0.3,
        maxZoom: 2.5,
        autoFollow: true // New: Whether the camera should automatically follow activity
    },

    /**
     * Check if mouse is hovering a node
     */
    checkHover(width, height) {
        let found = null;
        const { mousePos, panOffset, zoomScale } = this.state;

        Object.entries(PIPELINE_NODES).forEach(([id, node]) => {
            const pos = LayoutEngine.getNodePos(id);
            // Coordinate transformation: Screen -> World
            const x = (pos.x * zoomScale) + panOffset.x;
            const y = (pos.y * zoomScale) + panOffset.y;
            const dx = mousePos.x - x;
            const dy = mousePos.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < (40 * zoomScale)) found = id;
        });

        return found;
    },

    /**
     * Bind all interaction events
     */
    bindEvents(canvas, callbacks) {
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            this.state.mousePos = { x: currentX, y: currentY };

            if (this.state.isPanning) {
                const dx = currentX - this.state.lastPanPos.x;
                const dy = currentY - this.state.lastPanPos.y;
                this.state.panOffset.x += dx;
                this.state.panOffset.y += dy;
                this.state.lastPanPos = { x: currentX, y: currentY };
            }

            callbacks.onMouseMove();
        });

        canvas.addEventListener('mousedown', (e) => {
            // Middle button (1) or Right click (2)
            if (e.button === 1 || e.button === 2) {
                e.preventDefault();
                this.state.isPanning = true;
                this.state.autoFollow = false; // User takes manual control
                this.state.lastPanPos = { ...this.state.mousePos };
                canvas.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.state.isPanning) {
                this.state.isPanning = false;
                canvas.style.cursor = 'default';
            }
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        canvas.addEventListener('mouseleave', () => {
            callbacks.onMouseLeave();
        });

        canvas.addEventListener('click', (e) => {
            if (e.button !== 0) return; // Only left click for selection
            callbacks.onClick();
        });

        // Zoom Handling
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const nextZoom = this.state.zoomScale * delta;

            if (nextZoom >= this.state.minZoom && nextZoom <= this.state.maxZoom) {
                // Zoom relative to center or mouse? Let's keep it simple for now: center-ish
                this.state.zoomScale = nextZoom;
                callbacks.onMouseMove(); // Trigger redraw
            }
        }, { passive: false });
    }
};
