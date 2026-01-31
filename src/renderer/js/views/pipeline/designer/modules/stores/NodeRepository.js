/**
 * NodeRepository.js
 * Single responsibility: Node and connection management
 *
 * Extracted from DesignerStore to reduce coupling
 * All node queries and mutations go here
 */

import { Store } from '../../../../../core/Store.js';
import { NodeFactory } from '../NodeFactory.js';
import { GeometryUtils } from '../../GeometryUtils.js';
import { DESIGNER_CONSTANTS } from '../../DesignerConstants.js';

class NodeRepositoryClass extends Store {
    constructor() {
        super({
            nodes: {},
            connections: []
        });

        // Issue #13: Bounds cache for hit-testing performance
        this.boundsCache = {};

        // OPTIMIZATION: Adjacency list for O(1) child lookups
        this.childrenByParent = {};
    }

    // ============ QUERIES ============

    /**
     * Get single node by ID
     * @param {string} nodeId
     * @returns {Object|null} Node object or null
     */
    getNode(nodeId) {
        return this.state.nodes[nodeId] || null;
    }

    /**
     * Get all nodes as array
     * @returns {Array}
     */
    getAllNodes() {
        return Object.values(this.state.nodes);
    }

    /**
     * Get children of a container (Optimized O(1))
     * @param {string} parentId
     * @returns {Array}
     */
    getChildren(parentId) {
        if (!parentId) return [];
        const childIds = this.childrenByParent[parentId];
        if (!childIds) return [];

        return childIds
            .map(id => this.state.nodes[id])
            .filter(node => !!node); // Filter out any deleted nodes still in index
    }

    /**
     * Get all connections for a node
     * @param {string} nodeId
     * @returns {Array}
     */
    getConnectionsFor(nodeId) {
        return this.state.connections.filter(
            conn => conn.from === nodeId || conn.to === nodeId
        );
    }

    /**
     * Get connection by ID
     * @param {string} connectionId
     * @returns {Object|null}
     */
    getConnection(connectionId) {
        return this.state.connections.find(c => c.id === connectionId) || null;
    }

    /**
     * Get all connections
     * @returns {Array}
     */
    getAllConnections() {
        return [...this.state.connections];
    }

    // ============ MUTATIONS ============

    /**
     * Add a regular or container node
     * @param {boolean} isContainer
     * @param {number} x - Position
     * @param {number} y - Position
     * @param {Object} options - Node options
     * @returns {string} New node ID
     */
    addNode(isContainer, x, y, options = {}) {
        const newNode = isContainer ?
            NodeFactory.createContainerNode(options) :
            NodeFactory.createRegularNode(options);

        // Merge coordinates into options-processed node
        newNode.x = x;
        newNode.y = y;

        const nextNodes = { ...this.state.nodes };
        nextNodes[newNode.id] = newNode;

        this.setState({ nodes: nextNodes }, 'ADD_NODE');

        // Update index if it has a parent
        if (newNode.parentId) {
            this._addChildToIndex(newNode.parentId, newNode.id);
        }

        this.invalidateBoundsCache(newNode.id);

        return newNode.id;
    }

    /**
     * Add sticky note
     * @param {number} x
     * @param {number} y
     * @param {Object} options
     * @returns {string} New sticky note ID
     */
    addStickyNote(x, y, options = {}) {
        const newNote = NodeFactory.createStickyNote({
            x,
            y,
            ...options
        });

        const nextNodes = { ...this.state.nodes };
        nextNodes[newNote.id] = newNote;

        this.setState({ nodes: nextNodes }, 'ADD_STICKY_NOTE');

        // Update index if it has a parent
        if (newNote.parentId) {
            this._addChildToIndex(newNote.parentId, newNote.id);
        }

        this.invalidateBoundsCache(newNote.id);

        return newNote.id;
    }

    /**
     * Update node properties
     * @param {string} nodeId
     * @param {Object} updates
     * @returns {boolean} Success
     */
    updateNode(nodeId, updates) {
        const node = this.state.nodes[nodeId];
        if (!node) return false;

        const nextNodes = { ...this.state.nodes };
        nextNodes[nodeId] = {
            ...node,
            ...updates
        };

        this.setState({ nodes: nextNodes }, 'UPDATE_NODE');
        this.invalidateBoundsCache(nodeId);

        return true;
    }

    /**
     * Remove node and its connections
     * @param {string} nodeId
     * @returns {boolean} Success
     */
    removeNode(nodeId) {
        const node = this.state.nodes[nodeId];
        if (!node) return false;

        // Remove node
        const nextNodes = { ...this.state.nodes };
        delete nextNodes[nodeId];

        // Remove connections
        const nextConnections = this.state.connections.filter(
            conn => conn.from !== nodeId && conn.to !== nodeId
        );

        this.setState({
            nodes: nextNodes,
            connections: nextConnections
        }, 'REMOVE_NODE');

        // Update index
        if (node.parentId) {
            this._removeChildFromIndex(node.parentId, nodeId);
        }
        // If it was a parent, clear its index entries
        delete this.childrenByParent[nodeId];

        this.invalidateBoundsCache(nodeId);

        return true;
    }

    /**
     * Set parent of a node (drop into container)
     * @param {string} nodeId
     * @param {string|null} containerId
     * @returns {boolean} Success
     */
    dropNode(nodeId, containerId) {
        const node = this.state.nodes[nodeId];
        if (!node) return false;

        const nextNodes = { ...this.state.nodes };
        const oldParentId = node.parentId;

        nextNodes[nodeId] = {
            ...node,
            parentId: containerId
        };

        this.setState({ nodes: nextNodes }, 'DROP_NODE');

        // Update index: remove from old, add to new
        if (oldParentId) this._removeChildFromIndex(oldParentId, nodeId);
        if (containerId) this._addChildToIndex(containerId, nodeId);

        this.invalidateBoundsCache(nodeId);

        return true;
    }

    /**
     * Replace all nodes (batch operation)
     * @param {Object} nodes
     */
    setNodes(nodes) {
        this.setState({ nodes }, 'SET_NODES');
        // Do NOT clear entire bounds cache if possible, but for batch it's safer
        // However, we MUST rebuild the children index
        this._rebuildChildrenIndex(nodes);
        this.clearBoundsCache();
    }

    /**
     * Load initial nodes from storage/file
     * @param {Object} nodes
     */
    loadInitialNodes(nodes) {
        this.setState({ nodes }, 'LOAD_INITIAL_NODES');
        this._rebuildChildrenIndex(nodes);
        this.clearBoundsCache();
    }

    // ============ CONNECTIONS ============

    /**
     * Add connection between nodes
     * @param {string} fromId
     * @param {string} toId
     * @param {string} id - Optional: use specific ID
     * @returns {boolean} Success
     */
    addConnection(fromId, toId, id = null) {
        const from = this.state.nodes[fromId];
        const to = this.state.nodes[toId];

        if (!from || !to) return false;

        // Don't allow duplicate connections
        const exists = this.state.connections.some(
            c => c.from === fromId && c.to === toId
        );
        if (exists) return false;

        const connectionId = id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const nextConnections = [
            ...this.state.connections,
            {
                id: connectionId,
                from: fromId,
                to: toId,
                isManual: true
            }
        ];

        this.setState({ connections: nextConnections }, 'ADD_CONNECTION');
        return true;
    }

    /**
     * Remove connection by from/to IDs
     * @param {string} fromId
     * @param {string} toId
     * @returns {boolean} Success
     */
    removeConnection(fromId, toId) {
        const nextConnections = this.state.connections.filter(
            c => !(c.from === fromId && c.to === toId)
        );

        if (nextConnections.length === this.state.connections.length) {
            return false; // Nothing was removed
        }

        this.setState({ connections: nextConnections }, 'REMOVE_CONNECTION');
        return true;
    }

    /**
     * Delete connection by ID
     * @param {string} connectionId
     * @returns {boolean} Success
     */
    deleteConnection(connectionId) {
        const nextConnections = this.state.connections.filter(
            c => c.id !== connectionId
        );

        if (nextConnections.length === this.state.connections.length) {
            return false;
        }

        this.setState({ connections: nextConnections }, 'DELETE_CONNECTION');
        return true;
    }

    /**
     * Replace all connections (batch) with validation
     * @param {Array} connections
     */
    setConnections(connections) {
        // SAFETY: Validate connection structure before storing
        const validConnections = Array.isArray(connections) ? connections.filter(c => {
            if (!c || typeof c !== 'object') {
                console.warn('[NodeRepository] Invalid connection structure (not an object):', c);
                return false;
            }
            if (typeof c.from !== 'string' || typeof c.to !== 'string') {
                console.warn('[NodeRepository] Connection missing from/to:', c);
                return false;
            }
            return true;
        }) : [];

        if (validConnections.length !== (Array.isArray(connections) ? connections.length : 0)) {
            console.warn('[NodeRepository] Filtered out invalid connections. Before:', connections?.length || 0, 'After:', validConnections.length);
        }

        this.setState({ connections: [...validConnections] }, 'SET_CONNECTIONS');
        this.clearBoundsCache();
    }

    // ============ BOUNDS CACHING (Issue #13) ============

    /**
     * Get cached bounds for node at zoom level, computing if necessary
     * @param {string} nodeId
     * @param {number} zoomScale
     * @returns {Object|null} Cached bounds or null
     */
    getCachedBounds(nodeId, zoomScale = 1.0) {
        const cacheKey = `${nodeId}_${zoomScale}`;

        // Return if cached
        if (this.boundsCache[cacheKey]) {
            return this.boundsCache[cacheKey];
        }

        // Compute and cache if not found
        const node = this.state.nodes[nodeId];
        if (!node) return null;

        const { GeometryUtils } = (typeof window !== 'undefined' && window.GeometryUtils) ? window : { GeometryUtils: null };
        // Fallback: try to import if not on window (assuming it's imported in the file)
        // Note: NodeRepository already needs GeometryUtils for hit-testing logic if we move it here

        const bounds = this._computeNodeBounds(node, zoomScale);
        if (bounds) {
            this.boundsCache[cacheKey] = bounds;
        }

        return bounds;
    }

    /**
     * Private helper to compute bounds
     * @private
     * @param {Object} node
     * @param {number} zoomScale
     * @returns {Object|null}
     */
    _computeNodeBounds(node, zoomScale) {
        if (!node) return null;

        if (node.isRepoContainer) {
            return GeometryUtils.getContainerBounds(node, this.state.nodes, zoomScale);
        } else if (node.isStickyNote) {
            return GeometryUtils.getStickyNoteBounds(node, null, zoomScale);
        } else {
            // Regular node: use radius to calculate bounds
            const radius = GeometryUtils.getNodeRadius(node, zoomScale);
            return {
                centerX: node.x,
                centerY: node.y,
                w: radius * 2,
                h: radius * 2,
                renderW: radius * 2,
                renderH: radius * 2
            };
        }
    }

    /**
     * Set cached bounds (internal use only)
     * @param {string} nodeId
     * @param {number} zoomScale
     * @param {Object} bounds
     */
    setCachedBounds(nodeId, zoomScale = 1.0, bounds) {
        const cacheKey = `${nodeId}_${zoomScale}`;
        this.boundsCache[cacheKey] = bounds;
    }

    /**
     * Invalidate bounds cache for specific node (Recursive)
     * Called whenever node dimensions or position changes.
     * RECURSIVE: Also invalidates parent containers since their bounds depend on children.
     * @param {string} nodeId
     */
    invalidateBoundsCache(nodeId) {
        const node = this.state.nodes[nodeId];

        // Remove all cache entries for this node (all zoom levels)
        Object.keys(this.boundsCache).forEach(key => {
            if (key.startsWith(`${nodeId}_`)) {
                delete this.boundsCache[key];
            }
        });

        // RECURSIVE: If this node has a parent, the parent's bounds might have changed too
        if (node && node.parentId) {
            this.invalidateBoundsCache(node.parentId);
        }
    }

    /**
     * Clear entire bounds cache
     * Called on major state changes
     */
    clearBoundsCache() {
        this.boundsCache = {};
    }

    // ============ INTERNAL HELPERS ============

    _addChildToIndex(parentId, childId) {
        if (!this.childrenByParent[parentId]) {
            this.childrenByParent[parentId] = [];
        }
        if (!this.childrenByParent[parentId].includes(childId)) {
            this.childrenByParent[parentId].push(childId);
        }
    }

    _removeChildFromIndex(parentId, childId) {
        if (this.childrenByParent[parentId]) {
            this.childrenByParent[parentId] = this.childrenByParent[parentId].filter(id => id !== childId);
            if (this.childrenByParent[parentId].length === 0) {
                delete this.childrenByParent[parentId];
            }
        }
    }

    _rebuildChildrenIndex(nodes) {
        this.childrenByParent = {};
        Object.values(nodes).forEach(node => {
            if (node.parentId) {
                this._addChildToIndex(node.parentId, node.id);
            }
        });
    }
}

export const nodeRepository = new NodeRepositoryClass();
