/**
 * LayoutUtils.js
 * Utilidades de layout y animación física
 * Centraliza cálculos de dimensiones dinámicas y animaciones elásticas
 */

import { ThemeManager } from '../../../../core/ThemeManager.js';
import { ScalingCalculator } from './ScalingCalculator.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';

export const LayoutUtils = {
    /**
     * Calcula el tamaño objetivo de un contenedor basado en sus hijos y el zoom
     * @param {Object} containerNode - Nodo contenedor
     * @param {Array} childrenNodes - Array de nodos hijos
     * @param {number} zoomScale - Zoom actual para inflación visual
     * @param {Object} options - Opciones de cálculo
     */
    calculateContainerTargetSize(containerNode, childrenNodes, zoomScale = 1.0, options = {}) {
        // We defer GeometryUtils calls inside methods, but we can use ScalingCalculator directly for constants
        const layout = ThemeManager.geometry.layout.container;
        const {
            padding = layout.padding,
            minWidth = layout.minWidth,
            minHeight = layout.minHeight
        } = options;

        if (!childrenNodes || childrenNodes.length === 0) {
            return {
                targetW: minWidth,
                targetH: minHeight,
                centerX: containerNode.x,
                centerY: containerNode.y
            };
        }

        // Initialize min/max with starting values to avoid ReferenceError
        let minX = containerNode.x, maxX = containerNode.x;
        let minY = containerNode.y, maxY = containerNode.y;

        const vScale = ScalingCalculator.getVisualScale(zoomScale);

        childrenNodes.forEach(child => {
            const radius = GeometryUtils.getNodeRadius(child, zoomScale);
            const labelStr = child.label || "";
            const estimatedPixelWidth = (labelStr.length * DESIGNER_CONSTANTS.LAYOUT.TITLE_CHAR_WIDTH) * vScale;
            const effectiveHalfWidth = Math.max(radius, estimatedPixelWidth / 2 + (layout.labelPadding * vScale));

            minX = Math.min(minX, child.x - effectiveHalfWidth);
            maxX = Math.max(maxX, child.x + effectiveHalfWidth);
            minY = Math.min(minY, child.y - radius);
            maxY = Math.max(maxY, child.y + radius);
        });

        const basePadding = (padding + Math.min(childrenNodes.length * layout.growthPerChild, layout.maxGrowth)) * vScale;

        // SYMMETRIC GROWTH LOGIC:
        // To keep the center at node.x, node.y, the width must be twice the maximum distance from the center to any edge.
        const maxDistX = Math.max(Math.abs(maxX - containerNode.x), Math.abs(minX - containerNode.x));
        const maxDistY = Math.max(Math.abs(maxY - containerNode.y), Math.abs(minY - containerNode.y));

        const requiredW = (maxDistX * 2) + basePadding;
        const requiredH = (maxDistY * 2) + basePadding + (DESIGNER_CONSTANTS.LAYOUT.EXTRA_HEIGHT * vScale);

        const targetW = Math.max(minWidth * vScale, requiredW);
        const targetH = Math.max(minHeight * vScale, requiredH);

        // ALWAYS use node.x and node.y as center to avoid handle desync
        const centerX = containerNode.x;
        const centerY = containerNode.y;

        return { targetW, targetH, centerX, centerY };
    },

    /**
     * Ejecuta un paso de animación elástica
     * Actualiza las propiedades animW/animH hacia targetW/targetH
     * @param {Object} node - Nodo con propiedades dimensions
     * @param {number} damping - Factor de amortiguación (0.0-1.0, más bajo = más elástico)
     * @param {number} epsilon - Umbral de convergencia
     * @returns {boolean} true si hubo cambios
     */
    updateElasticDimensions(node, damping = DESIGNER_CONSTANTS.ANIMATION.ELASTIC_DAMPING, epsilon = DESIGNER_CONSTANTS.ANIMATION.ELASTIC_EPSILON) {
        if (!node.dimensions) return false;

        const dims = node.dimensions;
        let hasChanges = false;

        // Aplicar transición elástica a width
        if (dims.targetW !== undefined && Math.abs(dims.animW - dims.targetW) > epsilon) {
            dims.animW += (dims.targetW - dims.animW) * damping;
            if (Math.abs(dims.targetW - dims.animW) < epsilon) {
                dims.animW = dims.targetW;
            }
            hasChanges = true;
        }

        // Aplicar transición elástica a height
        if (dims.targetH !== undefined && Math.abs(dims.animH - dims.targetH) > epsilon) {
            dims.animH += (dims.targetH - dims.animH) * damping;
            if (Math.abs(dims.targetH - dims.animH) < epsilon) {
                dims.animH = dims.targetH;
            }
            hasChanges = true;
        }

        return hasChanges;
    },

    /**
     * Detecta colisiones entre un nodo y otros nodos
     * Útil para layout automático y prevención de overlaps
     * @param {Object} node - Nodo a verificar
     * @param {Array} otherNodes - Array de otros nodos
     * @param {number} minDistance - Distancia mínima requerida
     * @returns {Array} Array de nodos colisionando
     */
    detectCollisions(node, otherNodes, minDistance = ThemeManager.geometry.layout.physics.collisionBuffer) {
        const collisions = [];
        const nodeRadius = GeometryUtils.getNodeRadius(node, 1);

        otherNodes.forEach(other => {
            if (other.id === node.id) return;

            const otherRadius = GeometryUtils.getNodeRadius(other, 1);
            const distance = GeometryUtils.getDistance(
                { x: node.x, y: node.y },
                { x: other.x, y: other.y }
            );

            if (distance < (nodeRadius + otherRadius + minDistance)) {
                collisions.push({
                    node: other,
                    distance: distance,
                    overlap: (nodeRadius + otherRadius + minDistance) - distance
                });
            }
        });

        return collisions;
    },

    /**
     * Resuelve colisiones aplicando separación automática
     * @param {Object} node - Nodo a mover
     * @param {Array} collisions - Resultado de detectCollisions
     * @param {number} strength - Fuerza de separación (0.0-1.0)
     */
    resolveCollisions(node, collisions, strength = ThemeManager.geometry.layout.physics.strength) {
        if (collisions.length === 0) return;

        let totalForceX = 0;
        let totalForceY = 0;

        collisions.forEach(collision => {
            const other = collision.node;
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distance = collision.distance;

            if (distance > 0) {
                // Dirección de separación
                const forceX = (dx / distance) * collision.overlap * strength;
                const forceY = (dy / distance) * collision.overlap * strength;

                totalForceX += forceX;
                totalForceY += forceY;
            }
        });

        // Aplicar movimiento
        node.x += totalForceX;
        node.y += totalForceY;
    },

    /**
     * Calcula el ancho mínimo requerido para el título de un container
     * Evita que el texto del título desborde al hacer resize
     */
    calculateTitleMinWidth(label) {
        if (!label) return DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_W;
        const text = label.toUpperCase();
        const charWidth = DESIGNER_CONSTANTS.LAYOUT.TITLE_CHAR_WIDTH;
        const padding = DESIGNER_CONSTANTS.LAYOUT.TITLE_PADDING;
        return Math.max(DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_W, text.length * charWidth + padding);
    },

    /**
     * Lógica de límites de contenedor movida aquí para romper el ciclo con GeometryUtils
     */
    getContainerBounds(node, nodes, zoomScale = 1.0, dropTargetId = null) {
        const containerId = node.id;
        const isScaleUp = node.id === dropTargetId;
        const scaleFactor = isScaleUp ? DESIGNER_CONSTANTS.INTERACTION.DROP_TARGET_SCALE : 1.0;

        if (!node.dimensions) {
            const { STICKY_NOTE, CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
            node.dimensions = {
                w: CONTAINER.DEFAULT_W,
                h: CONTAINER.DEFAULT_H,
                animW: CONTAINER.DEFAULT_W,
                animH: CONTAINER.DEFAULT_H,
                targetW: CONTAINER.DEFAULT_W,
                targetH: CONTAINER.DEFAULT_H,
                isManual: false
            };
        }
        const dims = node.dimensions;
        const children = Object.values(nodes).filter(n => n.parentId === containerId);

        const target = this.calculateContainerTargetSize(node, children, zoomScale, {
            padding: DESIGNER_CONSTANTS.LAYOUT.CONTAINER_PADDING,
            minWidth: DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_W,
            minHeight: DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_H
        });

        const vScale = ScalingCalculator.getVisualScale(zoomScale);

        // Calculate minimum width based on title text
        const titleMinW = this.calculateTitleMinWidth(node.label);

        // NORMALIZE: contentMinW/H should be in LOGICAL units to be consistent with dims.w/h
        // Use the maximum between children-based min and title-based min
        node.dimensions.contentMinW = Math.max(target.targetW / vScale, titleMinW);
        node.dimensions.contentMinH = target.targetH / vScale;

        if (dims.isManual) {
            // Priority 1: User's manual width/height
            const baseW = Math.max(dims.w, DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_W);
            const baseH = Math.max(dims.h, DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_H);

            // We inflate it for the visual representation
            const renderW = baseW * vScale;
            const renderH = baseH * vScale;

            return {
                w: baseW, h: baseH,
                renderW: renderW * scaleFactor,
                renderH: renderH * scaleFactor,
                centerX: node.x, centerY: node.y
            };
        }

        if (dims._lastChildCount !== undefined && children.length > dims._lastChildCount) {
            dims.transitionPadding = DESIGNER_CONSTANTS.LAYOUT.AUTO_GROW_PADDING;
        }
        dims._lastChildCount = children.length;
        dims.transitionPadding = dims.transitionPadding || 0;
        dims.targetW = target.targetW + dims.transitionPadding;
        dims.targetH = target.targetH + dims.transitionPadding;

        this.updateElasticDimensions(node, DESIGNER_CONSTANTS.ANIMATION.ELASTIC_DAMPING, DESIGNER_CONSTANTS.ANIMATION.ELASTIC_EPSILON);
        dims.transitionPadding *= DESIGNER_CONSTANTS.ANIMATION.TRANSITION_DAMPING;
        if (dims.transitionPadding < 0.1) dims.transitionPadding = 0;

        return {
            w: target.targetW,
            h: target.targetH,
            renderW: dims.animW * scaleFactor,
            renderH: dims.animH * scaleFactor,
            centerX: node.x, // Enforce logical center
            centerY: node.y  // Enforce logical center
        };
    }
};

// Export to window for GeometryUtils fallback access (avoids circular import)
if (typeof window !== 'undefined') {
    window.LayoutUtils = LayoutUtils;
}
