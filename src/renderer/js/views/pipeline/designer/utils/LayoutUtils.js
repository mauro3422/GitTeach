/**
 * LayoutUtils.js
 * Utilidades de layout y animación física
 * Centraliza cálculos de dimensiones dinámicas y animaciones elásticas
 */

import { ThemeManager } from '../../../../core/ThemeManager.js';
import { ScalingCalculator } from './ScalingCalculator.js';
import { GeometryUtils } from '../GeometryUtils.js';

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

        // Import dynamic to avoid top-level cycle if needed, but ScalingCalculator is safe
        const vScale = ScalingCalculator.getVisualScale(zoomScale);

        childrenNodes.forEach(child => {
            const radius = GeometryUtils.getNodeRadius(child, zoomScale); // Usar inflación real
            const labelStr = child.label || "";
            // Los labels también crecen en importancia visual
            const estimatedPixelWidth = (labelStr.length * layout.labelCharWidth) * vScale;
            const effectiveHalfWidth = Math.max(radius, estimatedPixelWidth / 2 + (layout.labelPadding * vScale));

            minX = Math.min(minX, child.x - effectiveHalfWidth);
            maxX = Math.max(maxX, child.x + effectiveHalfWidth);
            minY = Math.min(minY, child.y - radius);
            maxY = Math.max(maxY, child.y + radius);
        });

        // El padding base también debe inflarse para evitar que los nodos toquen los bordes
        const basePadding = (padding + Math.min(childrenNodes.length * layout.growthPerChild, layout.maxGrowth)) * vScale;
        const hPadding = basePadding;

        const targetW = Math.max(minWidth * vScale, (maxX - minX) + basePadding);
        const targetH = Math.max(minHeight * vScale, (maxY - minY) + hPadding + (layout.extraHeight * vScale));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

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
    updateElasticDimensions(node, damping = ThemeManager.geometry.layout.physics.damping, epsilon = ThemeManager.geometry.layout.physics.epsilon) {
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
     * Algoritmos de layout automático predefinidos
     */
    LAYOUTS: {
        GRID: 'grid',
        FORCE_DIRECTED: 'force',
        CIRCULAR: 'circular'
    },

    /**
     * Aplica layout automático en grid
     * @param {Array} nodes - Nodos a organizar
     * @param {Object} bounds - {x, y, width, height} área disponible
     * @param {Object} options - {cols, spacing}
     */
    applyGridLayout(nodes, bounds, options = {}) {
        const { cols = 3, spacing = ThemeManager.geometry.grid.spacing } = options;
        const rows = Math.ceil(nodes.length / cols);

        nodes.forEach((node, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;

            node.x = bounds.x + (col - (cols - 1) / 2) * spacing;
            node.y = bounds.y + (row - (rows - 1) / 2) * spacing;
        });
    },

    /**
     * Calcula el centro de masa de un grupo de nodos
     * @param {Array} nodes - Nodos para calcular centro
     * @returns {Object} {x, y} centro de masa
     */
    calculateCenterOfMass(nodes) {
        if (nodes.length === 0) return { x: 0, y: 0 };

        let totalX = 0;
        let totalY = 0;

        nodes.forEach(node => {
            totalX += node.x;
            totalY += node.y;
        });

        return {
            x: totalX / nodes.length,
            y: totalY / nodes.length
        };
    },

    /**
     * Lógica de límites de contenedor movida aquí para romper el ciclo con GeometryUtils
     */
    getContainerBounds(node, nodes, zoomScale = 1.0, dropTargetId = null) {
        const containerId = node.id;
        const isScaleUp = node.id === dropTargetId;
        const scaleFactor = isScaleUp ? 1.10 : 1.0;

        if (!node.dimensions) {
            node.dimensions = { w: 180, h: 100, animW: 180, animH: 100, targetW: 180, targetH: 100, isManual: false };
        }
        const dims = node.dimensions;
        const children = Object.values(nodes).filter(n => n.parentId === containerId);

        const target = this.calculateContainerTargetSize(node, children, zoomScale, {
            padding: 60, minWidth: 140, minHeight: 100
        });

        node.dimensions.contentMinW = target.targetW;
        node.dimensions.contentMinH = target.targetH;

        if (dims.isManual) {
            const effectiveW = Math.max(dims.w, target.targetW);
            const effectiveH = Math.max(dims.h, target.targetH);
            return {
                w: dims.w, h: dims.h,
                renderW: effectiveW * scaleFactor,
                renderH: effectiveH * scaleFactor,
                centerX: node.x, centerY: node.y
            };
        }

        if (dims._lastChildCount !== undefined && children.length > dims._lastChildCount) {
            dims.transitionPadding = 50;
        }
        dims._lastChildCount = children.length;
        dims.transitionPadding = dims.transitionPadding || 0;
        dims.targetW = target.targetW + dims.transitionPadding;
        dims.targetH = target.targetH + dims.transitionPadding;

        this.updateElasticDimensions(node, 0.15, 0.5);
        dims.transitionPadding *= 0.85;
        if (dims.transitionPadding < 0.1) dims.transitionPadding = 0;

        return {
            w: target.targetW,
            h: target.targetH,
            renderW: dims.animW * scaleFactor,
            renderH: dims.animH * scaleFactor,
            centerX: target.centerX,
            centerY: target.centerY
        };
    }
};
