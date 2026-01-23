import { GeometryUtils } from '../GeometryUtils.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';

/**
 * DesignerLogic.js
 * Complex business logic and "physics" for the designer
 */
export const DesignerLogic = {
    /**
     * Calculates repulsion for siblings when a node is dropped into a container
     * @param {Object} node - The node being dropped
     * @param {Array} siblings - Other nodes in the same container
     * @returns {Object} Updated position {x, y}
     */
    calculateRepulsion(node, siblings) {
        const result = { x: node.x, y: node.y };
        const nodeGeom = ThemeManager.geometry.node;
        const nodeRadius = node.isSatellite ? nodeGeom.satelliteRadius : nodeGeom.defaultRadius;
        let attempts = 0;

        while (attempts < 20) {
            let hasCollision = false;
            for (const sibling of siblings) {
                const sibRadius = sibling.isSatellite ? nodeGeom.satelliteRadius : nodeGeom.defaultRadius;
                const minDist = nodeRadius + sibRadius + nodeGeom.repulsionBuffer;
                const dist = GeometryUtils.getDistance(result, sibling);

                if (dist < minDist) {
                    hasCollision = true;
                    // FIXED: Using centralized triangle math
                    const angle = GeometryUtils.calculateAngle(sibling, result) || (Math.random() * Math.PI * 2);
                    result.x += Math.cos(angle) * (minDist - dist + nodeGeom.repulsionForce);
                    result.y += Math.sin(angle) * (minDist - dist + nodeGeom.repulsionForce);
                    break;
                }
            }
            if (!hasCollision) break;
            attempts++;
        }

        return result;
    }
};
