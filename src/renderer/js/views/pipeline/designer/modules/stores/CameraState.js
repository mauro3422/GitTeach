/**
 * CameraState.js
 * Single responsibility: Pan and zoom state management
 *
 * Tracks viewport pan offset and zoom scale
 * Extracted from DesignerStore to reduce coupling
 */

import { Store } from '../../../../../core/Store.js';

class CameraStateClass extends Store {
    constructor() {
        super({
            panOffset: { x: 0, y: 0 },
            zoomScale: 1.0,
            isPanning: false
        });
    }

    // ============ CAMERA STATE ============

    /**
     * Update camera (pan and/or zoom)
     * @param {Object} updates - { panOffset?, zoomScale?, isPanning? }
     */
    setCamera(updates) {
        this.setState({
            panOffset: updates.panOffset !== undefined ? updates.panOffset : this.state.panOffset,
            zoomScale: updates.zoomScale !== undefined ? updates.zoomScale : this.state.zoomScale,
            isPanning: updates.isPanning !== undefined ? updates.isPanning : this.state.isPanning
        }, 'CAMERA_UPDATE');
    }

    // ============ PAN ============

    /**
     * Get current pan offset
     * @returns {Object} { x, y }
     */
    getPan() {
        return { ...this.state.panOffset };
    }

    /**
     * Set pan offset
     * @param {Object} panOffset - { x, y }
     */
    setPan(panOffset) {
        this.setCamera({ panOffset });
    }

    /**
     * Pan by delta
     * @param {number} dx
     * @param {number} dy
     */
    panBy(dx, dy) {
        const newPan = {
            x: this.state.panOffset.x + dx,
            y: this.state.panOffset.y + dy
        };
        this.setCamera({ panOffset: newPan });
    }

    // ============ ZOOM ============

    /**
     * Get current zoom scale
     * @returns {number}
     */
    getZoom() {
        return this.state.zoomScale;
    }

    /**
     * Set zoom scale
     * @param {number} zoomScale
     */
    setZoom(zoomScale) {
        this.setCamera({ zoomScale });
    }

    /**
     * Zoom by factor
     * @param {number} factor - Multiplier (e.g., 1.1 for 10% zoom in)
     * @param {number} minZoom - Minimum allowed zoom
     * @param {number} maxZoom - Maximum allowed zoom
     */
    zoomBy(factor, minZoom = 0.1, maxZoom = 5.0) {
        const newZoom = Math.max(
            minZoom,
            Math.min(maxZoom, this.state.zoomScale * factor)
        );
        this.setCamera({ zoomScale: newZoom });
    }

    /**
     * Reset zoom to 1.0
     */
    resetZoom() {
        this.setCamera({ zoomScale: 1.0 });
    }

    // ============ PANNING FLAG ============

    /**
     * Set panning state
     * @param {boolean} isPanning
     */
    setIsPanning(isPanning) {
        this.setCamera({ isPanning });
    }

    /**
     * Check if currently panning
     * @returns {boolean}
     */
    getIsPanning() {
        return this.state.isPanning;
    }

    // ============ VIEWPORT ============

    /**
     * Get full camera state
     * @returns {Object} { panOffset, zoomScale, isPanning }
     */
    getCamera() {
        return {
            panOffset: { ...this.state.panOffset },
            zoomScale: this.state.zoomScale,
            isPanning: this.state.isPanning
        };
    }

    /**
     * Reset camera to default
     * @param {number} defaultZoom - Default zoom scale
     */
    reset(defaultZoom = 1.0) {
        this.setState({
            panOffset: { x: 0, y: 0 },
            zoomScale: defaultZoom,
            isPanning: false
        }, 'CAMERA_RESET');
    }

    /**
     * Calculate viewport bounds in world space
     * Utility method for culling and hit testing
     * @param {number} screenWidth
     * @param {number} screenHeight
     * @returns {Object} { minX, maxX, minY, maxY }
     */
    getViewportBounds(screenWidth, screenHeight) {
        const halfW = screenWidth / 2 / this.state.zoomScale;
        const halfH = screenHeight / 2 / this.state.zoomScale;

        return {
            minX: this.state.panOffset.x - halfW,
            maxX: this.state.panOffset.x + halfW,
            minY: this.state.panOffset.y - halfH,
            maxY: this.state.panOffset.y + halfH
        };
    }

    /**
     * Check if point is in viewport
     * @param {Object} point - { x, y }
     * @param {number} screenWidth
     * @param {number} screenHeight
     * @returns {boolean}
     */
    isPointInViewport(point, screenWidth, screenHeight) {
        const bounds = this.getViewportBounds(screenWidth, screenHeight);
        return point.x >= bounds.minX && point.x <= bounds.maxX &&
               point.y >= bounds.minY && point.y <= bounds.maxY;
    }
}

export const cameraState = new CameraStateClass();
