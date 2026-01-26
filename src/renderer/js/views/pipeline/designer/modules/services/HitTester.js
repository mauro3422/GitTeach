/**
 * HitTester.js
 * Single responsibility: Hit detection queries
 *
 * Pure functions for finding nodes/connections at positions
 * Extracted from DesignerStore to reduce coupling
 * No state - just queries
 */

import { GeometryUtils } from '../../GeometryUtils.js';
import { DESIGNER_CONSTANTS } from '../../DesignerConstants.js';

export const HitTester = {
    /**
     * Find node at world position
     * @param {Object} worldPos - { x, y }
     * @param {Object} nodes - All nodes map
     * @param {number} zoomScale - Current zoom
     * @param {string} excludeId - Optional: node to exclude
     * @returns {Object|null} Node object or null
     */
    findNodeAt(worldPos, nodes, zoomScale = 1.0, excludeId = null) {
        if (!nodes || typeof nodes !== 'object') {
            return null;
        }

        const nodeList = Object.values(nodes);

        // Check from last to first (render order, top is last)
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];

            if (excludeId && node.id === excludeId) {
                continue;
            }

            // Hit test based on node type
            if (node.isRepoContainer || node.isStickyNote) {
                // Container: test against bounds
                const bounds = GeometryUtils.getContainerBounds(node, nodes, zoomScale);
                if (bounds && this._boundsContainPoint(bounds, worldPos)) {
                    return node;
                }
            } else {
                // Regular node: test against circle
                if (this._circleContainsPoint(node, worldPos, zoomScale)) {
                    return node;
                }
            }
        }

        return null;
    },

    /**
     * Find connection at world position
     * @param {Object} worldPos - { x, y }
     * @param {Array} connections - All connections
     * @param {Object} nodes - All nodes
     * @param {number} threshold - Hit threshold in pixels
     * @returns {Object|null} Connection or null
     */
    findConnectionAt(worldPos, connections, nodes, threshold = 10) {
        if (!connections || connections.length === 0) {
            return null;
        }

        // Check each connection for line intersection
        for (const conn of connections) {
            const fromNode = nodes[conn.from];
            const toNode = nodes[conn.to];

            if (!fromNode || !toNode) continue;

            // Get edge points
            const p1 = { x: fromNode.x, y: fromNode.y };
            const p2 = { x: toNode.x, y: toNode.y };

            // Check if point is near line
            if (GeometryUtils.isPointNearLine(worldPos, p1, p2, threshold)) {
                return conn;
            }
        }

        return null;
    },

    /**
     * Find drop target container for dragging node
     * @param {Object} worldPos - Current mouse position
     * @param {Object} nodes - All nodes
     * @param {string} draggingNodeId - Node being dragged
     * @param {number} zoomScale - Current zoom
     * @returns {string|null} Container node ID or null
     */
    findDropTarget(worldPos, nodes, draggingNodeId, zoomScale = 1.0) {
        if (!nodes || typeof nodes !== 'object') {
            return null;
        }

        const nodeList = Object.values(nodes);

        // Check containers in reverse order (top-most first)
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];

            // Skip non-containers and self
            if (!node.isRepoContainer || node.id === draggingNodeId) {
                continue;
            }

            // Test if position is inside container bounds
            const bounds = GeometryUtils.getContainerBounds(node, nodes, zoomScale);
            if (bounds && this._boundsContainPoint(bounds, worldPos)) {
                return node.id;
            }
        }

        return null;
    },

    /**
     * Find all nodes in a region
     * @param {Object} region - { minX, maxX, minY, maxY }
     * @param {Object} nodes - All nodes
     * @returns {Array} Nodes in region
     */
    findNodesInRegion(region, nodes) {
        return Object.values(nodes).filter(node => {
            if (node.isRepoContainer || node.isStickyNote) {
                const bounds = GeometryUtils.getContainerBounds(node, nodes);
                return this._boundsIntersectRegion(bounds, region);
            } else {
                // Circle node
                const radius = GeometryUtils.getNodeRadius(node);
                return this._circleIntersectsRegion(
                    { x: node.x, y: node.y, r: radius },
                    region
                );
            }
        });
    },

    /**
     * Test if point is inside circle
     * @private
     */
    _circleContainsPoint(node, point, zoomScale = 1.0) {
        const radius = GeometryUtils.getNodeRadius(node, zoomScale);
        const dist = GeometryUtils.getDistance(point, node);
        return dist < radius;
    },

    /**
     * Test if point is inside bounds
     * @private
     */
    _boundsContainPoint(bounds, point) {
        if (!bounds) return false;

        const w = bounds.renderW || bounds.w;
        const h = bounds.renderH || bounds.h;
        const cx = bounds.centerX;
        const cy = bounds.centerY;

        return point.x >= cx - w / 2 && point.x <= cx + w / 2 &&
            point.y >= cy - h / 2 && point.y <= cy + h / 2;
    },

    /**
     * Test if bounds intersect region (AABB collision)
     * @private
     */
    _boundsIntersectRegion(bounds, region) {
        if (!bounds) return false;

        const w = bounds.renderW || bounds.w;
        const h = bounds.renderH || bounds.h;
        const bx = bounds.centerX;
        const by = bounds.centerY;

        return !(
            bx + w / 2 < region.minX ||
            bx - w / 2 > region.maxX ||
            by + h / 2 < region.minY ||
            by - h / 2 > region.maxY
        );
    },

    /**
     * Test if circle intersects region
     * @private
     */
    _circleIntersectsRegion(circle, region) {
        const closest = {
            x: Math.max(region.minX, Math.min(circle.x, region.maxX)),
            y: Math.max(region.minY, Math.min(circle.y, region.maxY))
        };

        const dist = GeometryUtils.getDistance(
            { x: circle.x, y: circle.y },
            closest
        );

        return dist < circle.r;
    }
};
