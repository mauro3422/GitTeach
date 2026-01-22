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
        const nodeRadius = node.isSatellite ? 25 : 35;
        let attempts = 0;

        while (attempts < 20) {
            let hasCollision = false;
            for (const sibling of siblings) {
                const sibRadius = sibling.isSatellite ? 25 : 35;
                const minDist = nodeRadius + sibRadius + 15;
                const dx = result.x - sibling.x;
                const dy = result.y - sibling.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    hasCollision = true;
                    const angle = Math.atan2(dy, dx) || (Math.random() * Math.PI * 2);
                    result.x += Math.cos(angle) * (minDist - dist + 5);
                    result.y += Math.sin(angle) * (minDist - dist + 5);
                    break;
                }
            }
            if (!hasCollision) break;
            attempts++;
        }

        return result;
    }
};
