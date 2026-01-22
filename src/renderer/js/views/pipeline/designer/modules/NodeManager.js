import { PIPELINE_NODES } from '../../PipelineConstants.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';
import { DesignerStore } from './DesignerStore.js';

export const NodeManager = {
    // Getter for convenience, but state is held in DesignerStore
    get nodes() {
        return DesignerStore.state.nodes;
    },

    /**
     * Get a node by ID
     */
    getNode(id) {
        return this.nodes[id];
    },

    /**
     * Get all nodes
     */
    getAllNodes() {
        return Object.values(this.nodes);
    },

    /**
     * Get children of a parent node
     */
    getChildren(parentId) {
        return this.getAllNodes().filter(n => n.parentId === parentId);
    },

    /**
     * Unificar Sistema de Dimensiones (Issue #6)
     * Centraliza propiedades de tamaño y animación
     */
    _ensureDimensions(node, config = {}) {
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
        return node.dimensions;
    },

    /**
     * Load initial pipeline nodes
     */
    loadInitialNodes() {
        const scale = 1200;
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
            this._ensureDimensions(node, config);
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
                    this._ensureDimensions(child);
                    newNodes[childId] = child;
                });
            }
        });

        DesignerStore.setState({ nodes: newNodes });
    },

    /**
     * Add a custom node
     */
    addCustomNode(isContainer, centerX, centerY) {
        const typeLabel = isContainer ? 'Box' : 'Node';
        const count = Object.keys(this.nodes).filter(k => k.startsWith('custom_')).length + 1;
        const name = `${typeLabel} ${count}`;

        // Use a more robust unique ID generator to prevent duplicates
        const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const newNode = {
            id,
            x: centerX,
            y: centerY,
            label: name,
            icon: isContainer ? '📦' : '🧩',
            // No hardcoded color - let ContainerRenderer assign random neon color
            isRepoContainer: isContainer,
            description: `Elemento personalizado: ${name}`,
            internalClasses: []
        };
        this._ensureDimensions(newNode);

        const updatedNodes = { ...this.nodes, [id]: newNode };
        DesignerStore.setState({ nodes: updatedNodes });

        if (isContainer && typeof ContainerBoxManager?.createUserBox === 'function') {
            const margin = 100;
            const bounds = {
                xMin: centerX - 100,
                xMax: centerX + 100,
                yMin: centerY - 100,
                yMax: centerY + 100
            };
            ContainerBoxManager.createUserBox(id, bounds);
        }

        return newNode;
    },

    /**
     * Add a sticky note
     */
    addStickyNote(centerX, centerY) {
        const id = `sticky_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newNode = {
            id, x: centerX, y: centerY,
            label: 'Nota',
            text: 'Doble click para editar...',
            isStickyNote: true,
            dimensions: { w: 180, h: 100, animW: 180, animH: 100, targetW: 180, targetH: 100 }
        };

        const updatedNodes = { ...this.nodes, [id]: newNode };
        DesignerStore.setState({ nodes: updatedNodes });
        return newNode;
    },

    /**
     * Handle node drop (parenting)
     */
    handleNodeDrop(nodeId, containerId) {
        const node = this.nodes[nodeId];
        if (!node) return;

        node.parentId = containerId;

        // Collision detection logic preserved, operates on Store references
        const siblings = this.getChildren(containerId).filter(n => n.id !== nodeId);
        const nodeRadius = node.isSatellite ? 25 : 35;
        let attempts = 0;
        while (attempts < 20) {
            let hasCollision = false;
            for (const sibling of siblings) {
                const sibRadius = sibling.isSatellite ? 25 : 35;
                const minDist = nodeRadius + sibRadius + 15;
                const dx = node.x - sibling.x;
                const dy = node.y - sibling.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    hasCollision = true;
                    const angle = Math.atan2(dy, dx) || (Math.random() * Math.PI * 2);
                    node.x += Math.cos(angle) * (minDist - dist + 5);
                    node.y += Math.sin(angle) * (minDist - dist + 5);
                    break;
                }
            }
            if (!hasCollision) break;
            attempts++;
        }

        DesignerStore.setState({}); // Force re-render of observers
    },

    /**
     * Remove a node
     */
    removeNode(nodeId) {
        if (this.nodes[nodeId]) {
            const updatedNodes = { ...this.nodes };
            delete updatedNodes[nodeId];
            DesignerStore.setState({ nodes: updatedNodes });
            return true;
        }
        return false;
    },

    /**
     * Update node properties
     */
    updateNode(nodeId, updates) {
        if (!this.nodes[nodeId]) return false;
        Object.assign(this.nodes[nodeId], updates);
        DesignerStore.setState({}); // Force update
        return true;
    },

    /**
     * Set nodes (for undo/redo)
     */
    setNodes(nodes) {
        DesignerStore.setState({ nodes });
    }
};
