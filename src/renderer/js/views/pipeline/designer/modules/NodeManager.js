/**
 * NodeManager.js
 * Responsabilidad: CRUD y manipulación de nodos
 */

import { PIPELINE_NODES } from '../../PipelineConstants.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';

export const NodeManager = {
    nodes: {},

    /**
     * Initialize with existing nodes
     */
    init(nodes = {}) {
        this.nodes = nodes;
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
     * Load initial pipeline nodes
     */
    loadInitialNodes() {
        const scale = 1200;
        // Do NOT reassign this.nodes, clear it in-place to keep references alive
        Object.keys(this.nodes).forEach(key => delete this.nodes[key]);

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

            this.nodes[id] = {
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
        });

        // SECOND PASS: Create child nodes for internal components (folders/classes)
        // Restricted ONLY to Cache Store as per user request
        Object.keys(this.nodes).forEach(parentId => {
            if (parentId !== 'cache') return;

            const parent = this.nodes[parentId];
            if (parent.internalClasses && parent.internalClasses.length > 0) {
                const cols = 2; // Split in 2 columns for better box fit
                const gapX = 220; // Increased to avoid label overlap
                const gapY = 120; // Increased for vertical breathing room

                parent.internalClasses.forEach((className, idx) => {
                    const childId = `child_${parentId}_${idx}`;
                    const row = Math.floor(idx / cols);
                    const col = idx % cols;

                    this.nodes[childId] = {
                        id: childId,
                        parentId: parentId,
                        // Initial position relative to parent (centered-ish)
                        x: parent.x + (col - (cols - 1) / 2) * gapX,
                        y: parent.y + (row * gapY) + 50, // More top padding for title
                        label: className,
                        icon: '📁',
                        color: parent.color,
                        isSatellite: true // Use satellite sizing for cleaner look inside boxes
                    };
                });
            }
        });
    },

    /**
     * Add a custom node (container or regular)
     */
    addCustomNode(isContainer, centerX, centerY) {
        // Simplified: Generate default name immediately, no modal needed
        const typeLabel = isContainer ? 'Box' : 'Node';
        const count = Object.keys(this.nodes).filter(k => k.startsWith('custom_')).length + 1;
        const name = `${typeLabel} ${count}`;

        const id = `custom_${Date.now()}`;

        const newNode = {
            id,
            x: centerX,
            y: centerY,
            label: name,
            icon: isContainer ? '📦' : '🧩',
            color: isContainer ? '#8957e5' : '#238636',
            isRepoContainer: isContainer,
            description: `Elemento personalizado: ${name}`,
            internalClasses: isContainer ? [] : []
        };

        this.nodes[id] = newNode;

        // Register container in physics system if it's a box
        if (isContainer && typeof ContainerBoxManager?.createUserBox === 'function') {
            // Create box with default bounds around center position
            const margin = 100; // Default container size
            const bounds = {
                minX: centerX - margin,
                minY: centerY - margin,
                maxX: centerX + margin,
                maxY: centerY + margin
            };
            ContainerBoxManager.createUserBox(id, bounds, 40);
        }

        console.log(`[NodeManager] Added ${typeLabel}: ${name}`);
        return newNode;
    },

    /**
     * Add a sticky note
     */
    addStickyNote(centerX, centerY) {
        const id = `sticky_${Date.now()}`;

        const newNote = {
            id,
            x: centerX,
            y: centerY,
            text: 'Nueva nota...',
            isStickyNote: true,
            width: 180,
            height: 100,
            color: '#3fb950' // Neon green
        };

        this.nodes[id] = newNote;
        console.log(`[NodeManager] Added sticky note: ${id}`);
        return newNote;
    },

    /**
     * Handle node drop (parenting)
     */
    handleNodeDrop(nodeId, containerId) {
        const node = this.nodes[nodeId];
        const container = this.nodes[containerId];
        if (!node || !container) return;

        node.parentId = containerId;

        // Get all sibling nodes (other children of the same container)
        const siblings = this.getChildren(containerId).filter(n => n.id !== nodeId);

        // Collision detection and avoidance
        const nodeRadius = node.isSatellite ? 25 : 35;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            let hasCollision = false;
            for (const sibling of siblings) {
                const sibRadius = sibling.isSatellite ? 25 : 35;
                const minDist = nodeRadius + sibRadius + 15; // 15px gap
                const dx = node.x - sibling.x;
                const dy = node.y - sibling.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    hasCollision = true;
                    // Push node away from sibling
                    const angle = Math.atan2(dy, dx) || (Math.random() * Math.PI * 2);
                    const pushDist = minDist - dist + 5;
                    node.x += Math.cos(angle) * pushDist;
                    node.y += Math.sin(angle) * pushDist;
                    break;
                }
            }
            if (!hasCollision) break;
            attempts++;
        }
    },

    /**
     * Remove a node
     */
    removeNode(nodeId) {
        if (this.nodes[nodeId]) {
            delete this.nodes[nodeId];
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
        return true;
    },

    /**
     * Set nodes (for undo/redo)
     */
    setNodes(nodes) {
        this.nodes = { ...nodes };
    }
};
