/**
 * LayoutUtils.js
 * Utilidades de layout y animación física
 * Centraliza cálculos de dimensiones dinámicas y animaciones elásticas
 */

import { ThemeManager } from '../../../../core/ThemeManager.js';
import { ScalingCalculator } from './ScalingCalculator.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { BoundsCalculator } from './BoundsCalculator.js';

export const LayoutUtils = {
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

    getContainerBounds(node, nodes, zoomScale = 1.0, dropTargetId = null) {
        return BoundsCalculator.getContainerBounds(node, nodes, zoomScale, dropTargetId);
    }
};

// Export to window for GeometryUtils fallback access (avoids circular import)
// REMOVED: Hack window.LayoutUtils is no longer needed with BoundsCalculator.
