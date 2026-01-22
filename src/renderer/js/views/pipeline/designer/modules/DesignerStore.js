import { Store } from '../../../../core/Store.js';
import { HistoryManager } from './HistoryManager.js';
import { GeometryUtils } from '../GeometryUtils.js';

class DesignerStoreClass extends Store {
    constructor() {
        super({
            nodes: {},
            connections: [],
            navigation: {
                panOffset: { x: 0, y: 0 },
                zoomScale: 1.5
            },
            interaction: {
                mode: 'DRAG', // 'DRAG' | 'DRAW' | 'RESIZE'
                hoveredNodeId: null,
                selectedNodeId: null,
                draggingNodeId: null,
                resizingNodeId: null
            },
            // Debug / Dev flags
            debug: {
                showStartupLogs: true
            }
        });
    }

    // --- Queries ---

    getNode(id) {
        return this.state.nodes[id];
    }

    getAllNodes() {
        return Object.values(this.state.nodes);
    }

    getChildren(parentId) {
        return this.getAllNodes().filter(n => n.parentId === parentId);
    }

    getConnectionsFor(nodeId) {
        return this.state.connections.filter(c => c.from === nodeId || c.to === nodeId);
    }

    /**
     * Find the top-most node at a world position
     * @param {{x: number, y: number}} worldPos 
     * @param {string|null} excludeId 
     * @param {number} zoomScale 
     * @returns {Object|null}
     */
    findNodeAt(worldPos, excludeId = null, zoomScale = 1.0) {
        const nodeList = this.getAllNodes();

        // PASS 0: Sticky Notes - ULTRA PRIORITY (top-to-bottom rendering means we reverse)
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            const isSticky = node.isStickyNote === true || node.id?.startsWith('sticky_');
            if (!isSticky) continue;

            const margin = 20;
            const dims = node.dimensions || {};
            const rect = {
                x: node.x,
                y: node.y,
                w: (dims.animW || dims.w || 180) + margin * 2,
                h: (dims.animH || dims.h || 100) + margin * 2
            };

            if (GeometryUtils.isPointInRectangle(worldPos, rect)) return node;
        }

        // PASS 1: Regular Nodes (Circular)
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (node.isRepoContainer || node.isStickyNote) continue;

            if (GeometryUtils.isPointInNode(worldPos, node, zoomScale)) return node;
        }

        // PASS 2: Containers
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (!node.isRepoContainer) continue;

            if (GeometryUtils.isPointInContainer(worldPos, node, this.state.nodes, zoomScale)) return node;
        }

        return null;
    }

    // --- Actions ---

    /**
     * Set the entire node set (e.g. from file load)
     */
    setNodes(nodes) {
        this.setState({ nodes: { ...nodes } }, 'SET_NODES');
        this.validateAndCleanup();
    }

    /**
     * Update a single node or multiple nodes
     */
    updateNodes(nodeUpdates) {
        const nextNodes = { ...this.state.nodes, ...nodeUpdates };
        this.setState({ nodes: nextNodes }, 'UPDATE_NODES');
    }

    setConnections(connections) {
        this.setState({ connections: [...connections] }, 'SET_CONNECTIONS');
    }

    setInteractionState(partialState) {
        this.setState({
            interaction: { ...this.state.interaction, ...partialState }
        }, 'INTERACTION_UPDATE');
    }

    setNavigationState(partialState) {
        this.setState({
            navigation: { ...this.state.navigation, ...partialState }
        }, 'NAVIGATION_UPDATE');
    }

    // --- History Integration ---

    /**
     * Save current state to history before a destructive action
     * @param {string} actionType - From HistoryManager.ACTION_TYPES
     * @param {Object} metadata - { nodeId, description }
     */
    savepoint(actionType, metadata = {}) {
        HistoryManager.saveToHistory(
            this.state.nodes,
            this.state.connections,
            actionType,
            metadata
        );
    }

    /**
     * Undo the last action
     * @returns {boolean} Whether undo was successful
     */
    undo() {
        const prevState = HistoryManager.undo(this.state.nodes, this.state.connections);
        if (prevState) {
            HistoryManager.setRecording(false);
            this.setState({
                nodes: prevState.nodes,
                connections: prevState.connections
            }, 'UNDO');
            HistoryManager.setRecording(true);
            console.log(`[DesignerStore] Undo: ${prevState.actionType || 'unknown'}`);
            return true;
        }
        return false;
    }

    /**
     * Redo the last undone action
     * @returns {boolean} Whether redo was successful
     */
    redo() {
        const redoState = HistoryManager.redo(this.state.nodes, this.state.connections);
        if (redoState) {
            HistoryManager.setRecording(false);
            this.setState({
                nodes: redoState.nodes,
                connections: redoState.connections
            }, 'REDO');
            HistoryManager.setRecording(true);
            console.log(`[DesignerStore] Redo`);
            return true;
        }
        return false;
    }

    canUndo() { return HistoryManager.canUndo(); }
    canRedo() { return HistoryManager.canRedo(); }

    /**
     * Override setState for deep merging interaction/navigation if passed directly at root,
     * maintaining backward compatibility but encouraging use of specific actions.
     */
    setState(updates, actionName = 'DESIGNER_UPDATE') {
        const nextState = { ...this.state };
        let hasChanges = false;

        if (updates.nodes) {
            nextState.nodes = { ...updates.nodes };
            hasChanges = true;
        }
        if (updates.connections) {
            nextState.connections = [...updates.connections];
            hasChanges = true;
        }
        if (updates.navigation) {
            nextState.navigation = { ...nextState.navigation, ...updates.navigation };
            hasChanges = true;
        }
        if (updates.interaction) {
            nextState.interaction = { ...nextState.interaction, ...updates.interaction };
            hasChanges = true;
        }

        // Allow other keys
        Object.keys(updates).forEach(key => {
            if (!['nodes', 'connections', 'navigation', 'interaction'].includes(key)) {
                nextState[key] = updates[key];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            super.setState(nextState, actionName);
        }
    }

    /**
     * Validation and Cleanup (Issue #5 & #7)
     */
    validateAndCleanup() {
        const state = this.getState();
        const nodeIds = Object.keys(state.nodes);
        let hasChanges = false;

        // 1. Connection integrity
        const newConnections = state.connections.filter(c =>
            nodeIds.includes(c.from) && nodeIds.includes(c.to)
        );

        if (newConnections.length !== state.connections.length) {
            console.warn('[DesignerStore] Removed orphaned connections');
            hasChanges = true;
        }

        // 2. Parent integrity
        const newNodes = { ...state.nodes };
        let nodesChanged = false;
        Object.values(newNodes).forEach(node => {
            if (node.parentId && !nodeIds.includes(node.parentId)) {
                console.warn(`[DesignerStore] Removing invalid parentId ${node.parentId} from ${node.id}`);
                node.parentId = null;
                nodesChanged = true;
            }
        });

        if (hasChanges || nodesChanged) {
            // We use the internal setState logic to trigger avoiding infinite loops if carefully managed
            // but strictly we should just emit. Here we do an atomic update.
            this.setState({
                connections: newConnections,
                nodes: newNodes
            }, 'VALIDATION_CLEANUP');
        }
    }
}

export const DesignerStore = new DesignerStoreClass();
