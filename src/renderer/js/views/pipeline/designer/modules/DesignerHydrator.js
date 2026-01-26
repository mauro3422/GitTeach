import { PIPELINE_NODES } from '../../PipelineConstants.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { NodeFactory } from './NodeFactory.js';

/**
 * DesignerHydrator.js
 * Logic for initializing and hydrating nodes from constants or saved state
 */
export const DesignerHydrator = {
    /**
     * Load initial pipeline nodes from constants
     * @returns {Object} Initial nodes object
     */
    generateInitialNodes(scale = DESIGNER_CONSTANTS.DIMENSIONS.DEFAULT_HYDRATION_SCALE) {
        const newNodes = {};
        const orbitScale = ThemeManager.geometry.orbit.defaultScale;
        const hydration = ThemeManager.geometry.hydration;

        Object.entries(PIPELINE_NODES).forEach(([id, config]) => {
            if (config.isDynamic && config.hidden) return;

            let x = config.x * scale;
            let y = config.y * scale;

            if (config.isSatellite && config.orbitParent) {
                const parent = PIPELINE_NODES[config.orbitParent];
                if (parent) {
                    const radius = (config.orbitRadius || hydration.orbitRadius) * orbitScale;
                    const center = { x: parent.x * scale, y: parent.y * scale };
                    const pos = GeometryUtils.calculateOrbitPosition(center, radius, config.orbitAngle || 0);
                    x = pos.x;
                    y = pos.y;
                }
            }

            // Use NodeFactory to guarantee properties
            let node;
            if (config.isSatellite) {
                node = NodeFactory.createSatelliteNode({
                    id, x, y,
                    label: config.label,
                    icon: config.icon,
                    color: config.color,
                    description: config.description,
                    orbitParent: config.orbitParent
                });
            } else if (config.isRepoContainer) {
                node = NodeFactory.createContainerNode({
                    id, x, y,
                    label: config.label,
                    icon: config.icon,
                    color: config.color,
                    description: config.description,
                    internalClasses: config.internalClasses
                });
            } else {
                node = NodeFactory.createRegularNode({
                    id, x, y,
                    label: config.label,
                    icon: config.icon,
                    color: config.color,
                    description: config.description
                });
            }

            this.ensureDimensions(node, config);
            newNodes[id] = node;
        });

        // SECOND PASS: Internal components
        Object.keys(newNodes).forEach(parentId => {
            if (parentId !== 'cache') return;
            const parent = newNodes[parentId];
            if (parent.internalClasses && parent.internalClasses.length > 0) {
                const cols = 2;
                const gapX = hydration.childGapX;
                const gapY = ThemeManager.geometry.node.baseGapY;

                parent.internalClasses.forEach((className, idx) => {
                    const childId = `child_${parentId}_${idx}`;
                    const row = Math.floor(idx / cols);
                    const col = idx % cols;

                    // Use NodeFactory to guarantee properties
                    const labelLower = className.toLowerCase();
                    let componentIcon = '⚙️'; // Default for system logic

                    if (labelLower.includes('integrity')) componentIcon = '🛡️';
                    else if (labelLower.includes('repository')) componentIcon = '🗄️';
                    else if (labelLower.includes('manager')) componentIcon = '🛠️';
                    else if (labelLower.includes('cache')) componentIcon = '📦';
                    else if (className.includes('/')) componentIcon = '📁';

                    const child = NodeFactory.createSatelliteNode({
                        id: childId,
                        parentId: parentId,
                        x: parent.x + (col - (cols - 1) / 2) * gapX,
                        y: parent.y + (row * gapY) + DESIGNER_CONSTANTS.LAYOUT.CHILD_OFFSET_TOP,
                        label: className,
                        icon: componentIcon,
                        color: parent.color
                    });

                    this.ensureDimensions(child);
                    newNodes[childId] = child;
                });
            }
        });

        return newNodes;
    },

    /**
     * Ensure dimensions property exists
     */
    ensureDimensions(node, config = {}) {
        const hydration = ThemeManager.geometry.hydration;
        if (!node.dimensions) {
            node.dimensions = {
                w: config.width || hydration.defaultWidth,
                h: config.height || hydration.defaultHeight,
                targetW: config.width || hydration.defaultWidth,
                targetH: config.height || hydration.defaultHeight,
                animW: config.width || hydration.defaultWidth,
                animH: config.height || hydration.defaultHeight,
                isManual: !!(config.manualWidth || config.manualHeight)
            };
        }
    }
};
