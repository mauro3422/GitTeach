/**
 * GeometryUtils.js
 * Responsabilidad: Cálculos geométricos puros y hit-testing
 * Animaciones y layout dinámico movidos a LayoutUtils
 */

import { LayoutUtils } from './utils/LayoutUtils.js';

export const GeometryUtils = {
    /**
     * Calcula el radio dinámico de un nodo basado en zoom
     * @param {Object} node - El nodo
     * @param {number} zoomScale - Escala de zoom actual
     * @returns {number} Radio del nodo
     */
    getNodeRadius(node, zoomScale = 1) {
        const baseRadius = node.isSatellite ? 25 : 35;
        // Compensate partially for zoom: radius grows in world space as zoom decreases
        const comp = Math.pow(1 / zoomScale, 0.4);
        return baseRadius * Math.min(2.5, comp);
    },

    /**
     * Calcula los límites de un contenedor basados en sus hijos
     * @param {Object} node - Nodo contenedor
     * @param {Object} nodes - Todos los nodos
     * @param {number} zoomScale - Escala de zoom
     * @param {string|null} dropTargetId - ID del target de drop para highlighting
     * @returns {Object} Límites del contenedor {w, h, centerX, centerY}
     */
    getContainerBounds(node, nodes, zoomScale = 1.0, dropTargetId = null) {
        const containerId = node.id;
        const isScaleUp = node.id === dropTargetId;
        const scaleFactor = isScaleUp ? 1.10 : 1.0;

        // Initialize dimensions if missing (legacy recovery)
        if (!node.dimensions) {
            node.dimensions = {
                w: 180, h: 100, animW: 180, animH: 100, targetW: 180, targetH: 100, isManual: false
            };
        }
        const dims = node.dimensions;

        const children = Object.values(nodes).filter(n => n.parentId === containerId);

        // Calculate TARGET dimensions using LayoutUtils (Content Awareness)
        // We need this even in Manual Mode to determine the floor (minimum size)
        const target = LayoutUtils.calculateContainerTargetSize(node, children, {
            padding: 60,
            minWidth: 140,
            minHeight: 100
        });

        // Save constraints for ResizeHandler
        if (!node.dimensions) node.dimensions = {};
        node.dimensions.contentMinW = target.targetW;
        node.dimensions.contentMinH = target.targetH;

        // MANUAL MODE: Use user-provided dimensions, BUT clamp to content size (Auto-Grow)
        if (dims.isManual) {
            // "Elastic" behavior: If manual size is smaller than content, expand to fit content
            const effectiveW = Math.max(dims.w, target.targetW);
            const effectiveH = Math.max(dims.h, target.targetH);

            // Optional: Update dimensions to persist this growth?
            // If we don't update dims.w/h, it behaves like "Visual Inflation" (snap back on delete).
            // User asked: "se hace mas grande suavemente".
            // If we want smooth, we should use animW. 
            // For now, let's just make it robust (snap to fit).

            return {
                w: effectiveW * scaleFactor,
                h: effectiveH * scaleFactor,
                centerX: node.x,
                centerY: node.y
            };
        }

        // ELASTIC TRANSITION LOGIC (moved to LayoutUtils compatible format)
        if (dims._lastChildCount !== undefined && children.length > dims._lastChildCount) {
            dims.transitionPadding = 50; // Extra temporary padding to "pop" open
        }
        dims._lastChildCount = children.length;
        dims.transitionPadding = dims.transitionPadding || 0;

        // Apply transition padding to target (elastic effect)
        dims.targetW = target.targetW + dims.transitionPadding;
        dims.targetH = target.targetH + dims.transitionPadding;

        // Update elastic animation using LayoutUtils
        LayoutUtils.updateElasticDimensions(node, 0.15, 0.5);

        // Fade transition padding
        dims.transitionPadding *= 0.85;
        if (dims.transitionPadding < 0.1) dims.transitionPadding = 0;

        return {
            w: dims.animW * scaleFactor,
            h: dims.animH * scaleFactor,
            centerX: target.centerX,
            centerY: target.centerY
        };
    },

    /**
     * Verifica si un punto está dentro de un nodo
     * @param {Object} point - {x, y}
     * @param {Object} node - Nodo a verificar
     * @param {number} zoomScale - Escala de zoom
     * @returns {boolean}
     */
    isPointInNode(point, node, zoomScale = 1) {
        const radius = this.getNodeRadius(node, zoomScale);
        const dist = Math.sqrt((node.x - point.x) ** 2 + (node.y - point.y) ** 2);
        return dist < radius;
    },

    /**
     * Verifica si un punto está dentro de un contenedor
     * @param {Object} point - {x, y}
     * @param {Object} container - Nodo contenedor
     * @param {Object} nodes - Todos los nodos
     * @param {number} zoomScale - Escala de zoom
     * @returns {boolean}
     */
    isPointInContainer(point, container, nodes, zoomScale = 1) {
        if (!container.isRepoContainer) return false;
        const bounds = this.getContainerBounds(container, nodes, zoomScale);
        const w = bounds.w + 10;
        const h = bounds.h + 10;
        return point.x >= bounds.centerX - w / 2 && point.x <= bounds.centerX + w / 2 &&
            point.y >= bounds.centerY - h / 2 && point.y <= bounds.centerY + h / 2;
    },

    /**
     * Calcula la distancia entre dos puntos
     * @param {Object} p1 - Punto 1 {x, y}
     * @param {Object} p2 - Punto 2 {x, y}
     * @returns {number}
     */
    getDistance(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    },

    /**
     * Verifica si un punto está dentro de un rectángulo
     * @param {Object} point - {x, y}
     * @param {Object} rect - {x, y, w, h} o {minX, maxX, minY, maxY}
     * @returns {boolean}
     */
    isPointInRectangle(point, rect) {
        if (rect.w !== undefined) {
            // Format: {x, y, w, h}
            return point.x >= rect.x - rect.w / 2 && point.x <= rect.x + rect.w / 2 &&
                point.y >= rect.y - rect.h / 2 && point.y <= rect.y + rect.h / 2;
        } else {
            // Format: {minX, maxX, minY, maxY}
            return point.x >= rect.minX && point.x <= rect.maxX &&
                point.y >= rect.minY && point.y <= rect.maxY;
        }
    },

    /**
     * Calcula el punto de borde de un nodo hacia un target
     * @param {Object} node - Nodo fuente
     * @param {number} targetX - X del target
     * @param {number} targetY - Y del target
     * @param {Object} nodes - Todos los nodos
     * @param {Object} camera - Estado de la cámara
     * @returns {Object} Punto de borde {x, y}
     */
    getEdgePoint(node, targetX, targetY, nodes, camera) {
        const angle = Math.atan2(targetY - node.y, targetX - node.x);
        const isRectangular = node.isRepoContainer || node.isStickyNote;

        if (isRectangular) {
            // For rectangles, calculate intersection with border
            const bounds = node.isRepoContainer
                ? this.getContainerBounds(node, nodes, camera.zoomScale)
                : {
                    w: node.dimensions?.animW || node.dimensions?.w || 180,
                    h: node.dimensions?.animH || node.dimensions?.h || 100
                };

            const w = bounds.w / 2;
            const h = bounds.h / 2;
            const centerX = bounds.centerX || node.x;
            const centerY = bounds.centerY || node.y;

            // Calculate intersection with rectangle edges
            const tanAngle = Math.tan(angle);
            let edgeX, edgeY;

            // Check intersection with vertical edges (left/right)
            if (Math.abs(Math.cos(angle)) > 0.001) {
                const xSign = Math.cos(angle) > 0 ? 1 : -1;
                edgeX = centerX + w * xSign;
                edgeY = centerY + w * xSign * tanAngle;

                // Check if this point is within the horizontal bounds
                if (Math.abs(edgeY - centerY) <= h) {
                    return { x: edgeX, y: edgeY };
                }
            }

            // Otherwise intersect with horizontal edges (top/bottom)
            const ySign = Math.sin(angle) > 0 ? 1 : -1;
            edgeY = centerY + h * ySign;
            edgeX = centerX + h * ySign / tanAngle;
            return { x: edgeX, y: edgeY };
        } else {
            // For circles, use dynamic radius
            const zoomScale = camera.zoomScale;
            const radius = this.getNodeRadius(node, zoomScale);
            return {
                x: node.x + radius * Math.cos(angle),
                y: node.y + radius * Math.sin(angle)
            };
        }
    }
};
