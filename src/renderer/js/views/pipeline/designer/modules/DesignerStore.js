import { Store } from '../../../../core/Store.js';
import { HistoryManager } from './HistoryManager.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { DesignerHydrator } from './DesignerHydrator.js';
import { DesignerLogic } from './DesignerLogic.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { DragSelectionManager } from './DragSelectionManager.js';
import { NodeFactory } from './NodeFactory.js';

/**
 * Issue #13: Hit-Testing Memoization
 * Cache for node bounds calculations to improve hit-testing performance
 * Key format: "${nodeId}_${zoom}"
 */
const boundsCache = {};

class DesignerStoreClass extends Store {
    constructor() {
        super({
            nodes: {},
            connections: [],
            interaction: {
                hoveredNodeId: null,
                selectedNodeId: null,
                selectedConnectionId: null,
                draggingNodeId: null,
                resizingNodeId: null,
                activeMode: 'IDLE',
                resize: {
                    corner: null,
                    startMouse: null,
                    startLogicalSize: null,
                    startVisualSize: null,
                    childPositions: null
                }
            },
            camera: {
                panOffset: { x: 0, y: 0 },
                zoomScale: 1.0,
                isPanning: false
            }
        });
    }

    // --- Queries ---

    getNode(id) { return this.state.nodes[id]; }
    getAllNodes() { return Object.values(this.state.nodes); }
    getChildren(parentId) { return this.getAllNodes().filter(n => n.parentId === parentId); }
    getConnectionsFor(nodeId) { return this.state.connections.filter(c => c.from === nodeId || c.to === nodeId); }

    // --- Actions ---

    /**
     * Set the entire node set (e.g. from file load)
     */
    setNodes(nodes) {
        this.setState({ nodes: { ...nodes } }, 'SET_NODES');
        this.validateAndCleanup();
        this.clearBoundsCache();
    }

    /**
     * Load initial pipeline nodes using Hydrator
     */
    loadInitialNodes() {
        const newNodes = DesignerHydrator.generateInitialNodes(1200);
        this.setState({ nodes: newNodes, connections: [] }, 'LOAD_INITIAL_NODES');
        this.clearBoundsCache();
    }

    /**
     * Add a custom node - Uses NodeFactory for guaranteed properties
     */
    addNode(isContainer, x, y, options = {}) {
        const typeLabel = isContainer ? 'Box' : 'Node';
        const count = Object.keys(this.state.nodes).filter(k => k.startsWith('custom_')).length + 1;
        const name = options.label || `${typeLabel} ${count}`;
        const id = options.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const newNode = isContainer
            ? NodeFactory.createContainerNode({
                id,
                x,
                y,
                label: name,
                icon: '📦',
                description: options.description || `Elemento personalizado: ${name}`,
                internalClasses: [],
                ...options
            })
            : NodeFactory.createRegularNode({
                id,
                x,
                y,
                label: name,
                icon: '🧩',
                description: options.description || `Elemento personalizado: ${name}`,
                ...options
            });

        const nextNodes = { ...this.state.nodes, [id]: newNode };
        this.setState({ nodes: nextNodes }, 'ADD_NODE');

        if (isContainer && typeof ContainerBoxManager?.createUserBox === 'function') {
            const margin = 100;
            const bounds = { xMin: x - margin, xMax: x + margin, yMin: y - margin, yMax: y + margin };
            ContainerBoxManager.createUserBox(id, bounds);
        }

        return newNode;
    }

    /**
     * Add a sticky note - Uses NodeFactory for guaranteed properties
     */
    addStickyNote(x, y, options = {}) {
        const id = options.id || `sticky_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const newNode = NodeFactory.createStickyNote({
            id,
            x,
            y,
            label: options.label || 'Nota',
            text: options.text || 'Doble click para editar...',
            ...options
        });

        const nextNodes = { ...this.state.nodes, [id]: newNode };
        this.setState({ nodes: nextNodes }, 'ADD_STICKY');
        return newNode;
    }

    /**
     * Remove a node and its connections
     */
    removeNode(nodeId) {
        if (!this.state.nodes[nodeId]) return false;

        const nextNodes = { ...this.state.nodes };
        delete nextNodes[nodeId];

        const nextConnections = this.state.connections.filter(c => c.from !== nodeId && c.to !== nodeId);

        this.setState({
            nodes: nextNodes,
            connections: nextConnections
        }, 'REMOVE_NODE');

        this.invalidateBoundsCache(nodeId);

        return true;
    }

    /**
     * Update node properties
     */
    updateNode(nodeId, updates) {
        const node = this.state.nodes[nodeId];
        if (!node) return false;

        const nextNodes = {
            ...this.state.nodes,
            [nodeId]: { ...node, ...updates }
        };
        this.setState({ nodes: nextNodes }, 'UPDATE_NODE');

        this.invalidateBoundsCache(nodeId);

        return true;
    }

    /**
     * Handle node drop (parenting/repelling) using Logic helper
     */
    dropNode(nodeId, containerId) {
        const originalNode = this.state.nodes[nodeId];
        if (!originalNode) return;

        // Delegate repulsion physics to Logic module (passing a clone)
        const siblings = this.getChildren(containerId).filter(n => n.id !== nodeId);
        const { x, y } = DesignerLogic.calculateRepulsion({ ...originalNode }, siblings);

        this.updateNode(nodeId, {
            parentId: containerId,
            x: x,
            y: y
        });
    }

    /**
     * Add/Remove connections
     */
    addConnection(fromId, toId, id = null) {
        if (this.state.connections.some(c => c.from === fromId && c.to === toId)) return false;
        const connId = id || `${fromId}-${toId}`;
        const nextConnections = [...this.state.connections, { id: connId, from: fromId, to: toId }];
        this.setState({ connections: nextConnections }, 'ADD_CONNECTION');
        return true;
    }

    removeConnection(fromId, toId) {
        const targetId = `${fromId}-${toId}`;
        const nextConnections = this.state.connections.filter(c => {
            const id = c.id || `${c.from}-${c.to}`;
            return id !== targetId;
        });
        if (nextConnections.length === this.state.connections.length) return false;
        this.setState({ connections: nextConnections }, 'REMOVE_CONNECTION');
        return true;
    }

    deleteConnection(connectionId) {
        const nextConnections = this.state.connections.filter(c => {
            const id = c.id || `${c.from}-${c.to}`;
            return id !== connectionId;
        });
        if (nextConnections.length === this.state.connections.length) return false;
        this.setState({ connections: nextConnections }, 'DELETE_CONNECTION');
        return true;
    }

    setConnections(connections) {
        // SAFETY: Validate connection structure before storing
        const validConnections = Array.isArray(connections) ? connections.filter(c => {
            if (!c || typeof c !== 'object') {
                console.warn('[DesignerStore] Invalid connection structure (not an object):', c);
                return false;
            }
            if (typeof c.from !== 'string' || typeof c.to !== 'string') {
                console.warn('[DesignerStore] Connection missing from/to:', c);
                return false;
            }
            return true;
        }) : [];

        if (validConnections.length !== (Array.isArray(connections) ? connections.length : 0)) {
            console.warn('[DesignerStore] Filtered out invalid connections. Before:', connections?.length || 0, 'After:', validConnections.length);
        }

        this.setState({ connections: [...validConnections] }, 'SET_CONNECTIONS');
        this.clearBoundsCache();
    }

    // --- State Accessors (Interaction & Camera) ---

    setHover(nodeId) {
        if (this.state.interaction.hoveredNodeId === nodeId) return;
        this.setInteractionState({ hoveredNodeId: nodeId });
    }

    setDragging(nodeId) {
        const updates = {
            draggingNodeId: nodeId,
            activeMode: nodeId ? 'DRAG' : 'IDLE'
        };

        // CRITICAL FIX: Clear selectedNodeId when drag ends (nodeId === null)
        // This prevents the previous node from staying "selected" and hijacking next drag
        if (nodeId === null) {
            updates.selectedNodeId = null;
        }

        this.setInteractionState(updates);
    }

    /**
     * Start resize operation with full state
     */
    startResize(nodeId, resizeState) {
        this.setInteractionState({
            resizingNodeId: nodeId,
            activeMode: 'RESIZE',
            resize: {
                corner: resizeState.corner,
                startMouse: { ...resizeState.startMouse },
                startLogicalSize: { ...resizeState.startLogicalSize },
                startVisualSize: { ...resizeState.startVisualSize },
                childPositions: resizeState.childPositions ? { ...resizeState.childPositions } : null
            }
        });
    }

    /**
     * Clear resize state completely
     */
    clearResize() {
        this.setInteractionState({
            resizingNodeId: null,
            activeMode: 'IDLE',
            resize: {
                corner: null,
                startMouse: null,
                startLogicalSize: null,
                startVisualSize: null,
                childPositions: null
            }
        });
    }

    setDrawing(sourceNodeId) {
        this.setInteractionState({
            activeMode: sourceNodeId ? 'DRAW' : 'IDLE'
        });
    }

    setInteractionState(partial) {
        const newState = { ...this.state.interaction, ...partial };
        this._validateInteractionState(newState);
        this.setState({ interaction: newState }, 'INTERACTION_UPDATE');
    }

    _validateInteractionState(state) {
        const activeModes = [];
        if (state.draggingNodeId) activeModes.push('DRAG');
        if (state.resizingNodeId) activeModes.push('RESIZE');
        if (state.activeMode === 'DRAW') activeModes.push('DRAW');
        if (this.state.camera.isPanning) activeModes.push('PAN');

        if (activeModes.length > 1) {
            console.warn(`[InteractionWarning] Multiple active modes detected: ${activeModes.join(', ')}`);
            if (state.activeMode !== 'IDLE') {
                if (state.activeMode !== 'DRAG') state.draggingNodeId = null;
                if (state.activeMode !== 'RESIZE') {
                    state.resizingNodeId = null;
                    state.resize = {
                        corner: null,
                        startMouse: null,
                        startLogicalSize: null,
                        startVisualSize: null,
                        childPositions: null
                    };
                }
            } else {
                state.draggingNodeId = null;
                state.resizingNodeId = null;
                state.resize = {
                    corner: null,
                    startMouse: null,
                    startLogicalSize: null,
                    startVisualSize: null,
                    childPositions: null
                };
            }
        }

        if (state.resizingNodeId && state.activeMode !== 'RESIZE') {
            console.warn('[InteractionWarning] resizingNodeId set but activeMode is not RESIZE');
            state.activeMode = 'RESIZE';
        }
        if (state.draggingNodeId && state.activeMode !== 'DRAG') {
            console.warn('[InteractionWarning] draggingNodeId set but activeMode is not DRAG');
            state.activeMode = 'DRAG';
        }
    }

    setCamera(updates) {
        this.setState({
            camera: { ...this.state.camera, ...updates }
        }, 'CAMERA_UPDATE');
    }

    /**
     * Cancel ALL active interactions (Emergency reset)
     */
    cancelAllInteractions() {
        this.setState({
            interaction: {
                ...this.state.interaction,
                draggingNodeId: null,
                resizingNodeId: null,
                activeMode: 'IDLE',
                resize: {
                    corner: null,
                    startMouse: null,
                    startLogicalSize: null,
                    startVisualSize: null,
                    childPositions: null
                }
            },
            camera: {
                ...this.state.camera,
                isPanning: false
            }
        }, 'CANCEL_ALL_INTERACTIONS');
    }

    /**
     * Set selected node
     */
    selectNode(nodeId) {
        if (this.state.interaction.selectedNodeId === nodeId) return;
        this.setState({
            interaction: {
                ...this.state.interaction,
                selectedNodeId: nodeId,
                selectedConnectionId: null
            }
        }, 'SELECT_NODE');
    }

    selectConnection(connectionId) {
        if (this.state.interaction.selectedConnectionId === connectionId) return;
        this.setState({
            interaction: {
                ...this.state.interaction,
                selectedNodeId: null,
                selectedConnectionId: connectionId
            }
        }, 'SELECT_CONNECTION');
    }

    /**
     * Clear current selection
     */
    clearSelection() {
        if (this.state.interaction.selectedNodeId === null && this.state.interaction.selectedConnectionId === null) return;
        this.setState({
            interaction: {
                ...this.state.interaction,
                selectedNodeId: null,
                selectedConnectionId: null
            }
        }, 'CLEAR_SELECTION');
    }

    // --- Hit Detection ---

    findNodeAt(worldPos, excludeId = null, zoomScale = 1.0) {
        // ROBUST PATTERN: Delegar a DragSelectionManager (Single Source of Truth para hit-testing)
        return DragSelectionManager.findNodeAtPosition(this.getAllNodes(), worldPos, zoomScale, excludeId);
    }

    findConnectionAt(worldPos) {
        const nodes = this.state.nodes;
        for (const conn of this.state.connections) {
            const fromNode = nodes[conn.from];
            const toNode = nodes[conn.to];
            if (!fromNode || !toNode) continue;

            // Simple hit test between nodes
            if (GeometryUtils.isPointNearLine(worldPos, fromNode, toNode, ThemeManager.geometry.thresholds.connectionHitBuffer)) {
                return conn.id || `${conn.from}-${conn.to}`;
            }
        }
        return null;
    }

    findDropTarget(draggingNodeId, zoomScale = 1.0) {
        const draggingNode = this.state.nodes[draggingNodeId];
        if (!draggingNode) return null;

        const nodeList = this.getAllNodes();
        // PERF: Iterate backwards without allocation
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const container = nodeList[i];
            if (!container.isRepoContainer || container.id === draggingNodeId) continue;
            const bounds = GeometryUtils.getContainerBounds(container, this.state.nodes, zoomScale);
            if (GeometryUtils.isPointInRectangle(
                { x: draggingNode.x, y: draggingNode.y },
                { x: bounds.centerX, y: bounds.centerY, w: bounds.renderW || bounds.w, h: bounds.renderH || bounds.h }
            )) {
                return container.id;
            }
        }
        return null;
    }

    // --- Issue #13: Bounds Caching (Hit-Testing Memoization) ---

    /**
     * Get cached bounds for a node, computing and caching if necessary
     * @param {string} nodeId - Node ID
     * @param {number} zoomScale - Camera zoom scale
     * @returns {Object} Bounds { x, y, w, h, centerX, centerY, ... }
     */
    getCachedBounds(nodeId, zoomScale = 1.0) {
        const node = this.state.nodes[nodeId];
        if (!node) return null;

        const cacheKey = `${nodeId}_${zoomScale}`;

        // Return cached bounds if available
        if (boundsCache[cacheKey]) {
            return boundsCache[cacheKey];
        }

        // Compute and cache bounds
        let bounds;
        if (node.isRepoContainer) {
            bounds = GeometryUtils.getContainerBounds(node, this.state.nodes, zoomScale);
        } else if (node.isStickyNote) {
            bounds = GeometryUtils.getStickyNoteBounds(node, null, zoomScale);
        } else {
            // Regular node: use radius to calculate bounds
            const radius = GeometryUtils.getNodeRadius(node, zoomScale);
            bounds = {
                centerX: node.x,
                centerY: node.y,
                w: radius * 2,
                h: radius * 2,
                renderW: radius * 2,
                renderH: radius * 2
            };
        }

        // Store in cache
        if (bounds) {
            boundsCache[cacheKey] = bounds;
        }

        return bounds;
    }

    /**
     * Invalidate cached bounds for a specific node (all zoom levels)
     * Called when node properties change
     */
    invalidateBoundsCache(nodeId) {
        // Remove all cache entries for this node
        for (const key in boundsCache) {
            if (key.startsWith(nodeId + '_')) {
                delete boundsCache[key];
            }
        }
    }

    /**
     * Clear entire bounds cache (e.g., on major state changes)
     */
    clearBoundsCache() {
        for (const key in boundsCache) {
            delete boundsCache[key];
        }
    }

    // --- History & Undo/Redo (Unified via HistoryManager) ---

    savepoint(actionType, metadata = {}) {
        HistoryManager.saveToHistory(this.state.nodes, this.state.connections, actionType, metadata);
    }

    undo() {
        const prev = HistoryManager.undo(this.state.nodes, this.state.connections);
        if (!prev) return false;
        HistoryManager.setRecording(false);
        this.setState({ nodes: prev.nodes, connections: prev.connections }, 'UNDO');
        HistoryManager.setRecording(true);
        return true;
    }

    redo() {
        const next = HistoryManager.redo(this.state.nodes, this.state.connections);
        if (!next) return false;
        HistoryManager.setRecording(false);
        this.setState({ nodes: next.nodes, connections: next.connections }, 'REDO');
        HistoryManager.setRecording(true);
        return true;
    }

    canUndo() {
        return HistoryManager.canUndo();
    }

    canRedo() {
        return HistoryManager.canRedo();
    }

    clearHistory() {
        HistoryManager.clear();
    }

    validateAndCleanup() {
        const { nodes, connections } = this.state;
        const ids = Object.keys(nodes);

        const newConnections = connections.filter(c => ids.includes(c.from) && ids.includes(c.to));
        const newNodes = { ...nodes };
        let nodesChanged = false;

        Object.values(newNodes).forEach(node => {
            if (node.parentId && !ids.includes(node.parentId)) {
                node.parentId = null;
                nodesChanged = true;
            }
        });

        if (newConnections.length !== connections.length || nodesChanged) {
            this.setState({ connections: newConnections, nodes: newNodes }, 'VALIDATION_CLEANUP');
        }
    }
}

export const DesignerStore = new DesignerStoreClass();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.DesignerStore = DesignerStore;
}
