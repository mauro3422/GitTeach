import { PIPELINE_NODES } from '../../PipelineConstants.js';

/**
 * DesignerHydrator.js
 * Logic for initializing and hydrating nodes from constants or saved state
 */
export const DesignerHydrator = {
    /**
     * Load initial pipeline nodes from constants
     * @returns {Object} Initial nodes object
     */
    generateInitialNodes(scale = 1200) {
        const newNodes = {};

        Object.entries(PIPELINE_NODES).forEach(([id, config]) => {
            if (config.isDynamic && config.hidden) return;

            let x = config.x * scale;
            let y = config.y * scale;

            if (config.isSatellite && config.orbitParent) {
                const parent = PIPELINE_NODES[config.orbitParent];
                if (parent) {
                    const radius = (config.orbitRadius || 0.18) * 800;
                    const angle = (config.orbitAngle || 0) * (Math.PI / 180);
                    x = (parent.x * scale) + radius * Math.cos(angle);
                    y = (parent.y * scale) + radius * Math.sin(angle);
                }
            }

            const node = {
                id, x, y,
                label: config.label,
                sublabel: config.sublabel,
                icon: config.icon,
                color: config.color,
                description: config.description,
                internalClasses: config.internalClasses,
                isRepoContainer: config.isRepoContainer,
                isSatellite: config.isSatellite,
                orbitParent: config.orbitParent
            };
            this.ensureDimensions(node, config);
            newNodes[id] = node;
        });

        // SECOND PASS: Internal components
        Object.keys(newNodes).forEach(parentId => {
            if (parentId !== 'cache') return;
            const parent = newNodes[parentId];
            if (parent.internalClasses && parent.internalClasses.length > 0) {
                const cols = 2;
                const gapX = 220;
                const gapY = 120;

                parent.internalClasses.forEach((className, idx) => {
                    const childId = `child_${parentId}_${idx}`;
                    const row = Math.floor(idx / cols);
                    const col = idx % cols;

                    const child = {
                        id: childId,
                        parentId: parentId,
                        x: parent.x + (col - (cols - 1) / 2) * gapX,
                        y: parent.y + (row * gapY) + 50,
                        label: className,
                        icon: '📁',
                        color: parent.color,
                        isSatellite: true
                    };
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
        if (!node.dimensions) {
            node.dimensions = {
                w: config.width || 180,
                h: config.height || 100,
                targetW: config.width || 180,
                targetH: config.height || 100,
                animW: config.width || 180,
                animH: config.height || 100,
                isManual: !!(config.manualWidth || config.manualHeight)
            };
        }
    }
};
