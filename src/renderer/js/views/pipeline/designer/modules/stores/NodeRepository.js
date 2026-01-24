/**
 * NodeRepository.js
 * Single responsibility: Node and connection management
 *
 * Extracted from DesignerStore to reduce coupling
 * All node queries and mutations go here
 */

import { Store } from '../../../../../core/Store.js';
import { NodeFactory } from '../NodeFactory.js';
import { DESIGNER_CONSTANTS } from '../../DesignerConstants.js';

class NodeRepositoryClass extends Store {
    constructor() {
        super({
            nodes: {},
            connections: []
        });

        // Issue #13: Bounds cache for hit-testing performance
        this.boundsCache = {};
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
     * Get children of a container
     * @param {string} parentId
     * @returns {Array}
     */
    getChildren(parentId) {
        return Object.values(this.state.nodes).filter(
            node => node.parentId === parentId
        );
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
        const nodeFactory = isContainer ?
            NodeFactory.createContainerNode :
            NodeFactory.createRegularNode;

        const newNode = nodeFactory({
            x,
            y,
            ...options
        });

        const nextNodes = { ...this.state.nodes };
        nextNodes[newNode.id] = newNode;

        this.setState({ nodes: nextNodes }, 'ADD_NODE');
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
        nextNodes[nodeId] = {
            ...node,
            parentId: containerId
        };

        this.setState({ nodes: nextNodes }, 'DROP_NODE');
        this.invalidateBoundsCache(nodeId);

        return true;
    }

    /**
     * Replace all nodes (batch operation)
     * @param {Object} nodes
     */
    setNodes(nodes) {
        this.setState({ nodes }, 'SET_NODES');
        this.clearBoundsCache();
    }

    /**
     * Load initial nodes from storage/file
     * @param {Object} nodes
     */
    loadInitialNodes(nodes) {
        this.setState({ nodes }, 'LOAD_INITIAL_NODES');
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
     * Replace all connections (batch)
     * @param {Array} connections
     */
    setConnections(connections) {
        this.setState({ connections }, 'SET_CONNECTIONS');
    }

    // ============ BOUNDS CACHING (Issue #13) ============

    /**
     * Get cached bounds for node at zoom level
     * @param {string} nodeId
     * @param {number} zoomScale
     * @returns {Object|null} Cached bounds or null
     */
    getCachedBounds(nodeId, zoomScale = 1.0) {
        const cacheKey = `${nodeId}_${zoomScale}`;
        return this.boundsCache[cacheKey] || null;
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
     * Invalidate bounds cache for specific node
     * Called whenever node dimensions or position changes
     * @param {string} nodeId
     */
    invalidateBoundsCache(nodeId) {
        // Remove all cache entries for this node (all zoom levels)
        Object.keys(this.boundsCache).forEach(key => {
            if (key.startsWith(`${nodeId}_`)) {
                delete this.boundsCache[key];
            }
        });
    }

    /**
     * Clear entire bounds cache
     * Called on major state changes
     */
    clearBoundsCache() {
        this.boundsCache = {};
    }

    /**
     * Get cache stats (debugging)
     * @returns {Object}
     */
    getCacheStats() {
        return {
            entries: Object.keys(this.boundsCache).length,
            size: JSON.stringify(this.boundsCache).length
        };
    }
}

export const nodeRepository = new NodeRepositoryClass();
