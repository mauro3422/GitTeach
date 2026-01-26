import { Store } from '../../../../core/Store.js';
import { HistoryManager } from './HistoryManager.js';
import { DesignerHydrator } from './DesignerHydrator.js';
import { DesignerLogic } from './DesignerLogic.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';
import { nodeRepository } from './stores/NodeRepository.js';
import { interactionState } from './stores/InteractionState.js';
import { cameraState } from './stores/CameraState.js';
import { HitTester } from './services/HitTester.js';

/**
 * DesignerStore
 * Now acts as a Thin Wrapper (Facade) for specialized TIER 2 stores.
 * Maintains backward compatibility with the existing API while delegating 
 * logic to NodeRepository, InteractionState, and CameraState.
 */
class DesignerStoreClass extends Store {
    constructor() {
        super({}); // Internal state is mostly empty, we use aggregated getters

        // ROBUST PATTERN: Sync changes from sub-stores to the Facade
        // This ensures subscribers to DesignerStore still receive updates
        nodeRepository.subscribe(() => this.setState({}, 'NODE_UPDATE_SYNC'));
        interactionState.subscribe(() => this.setState({}, 'INTERACTION_UPDATE_SYNC'));
        cameraState.subscribe(() => this.setState({}, 'CAMERA_UPDATE_SYNC'));
    }

    /**
     * Override setState to distribute updates to sub-stores.
     * This maintains backward compatibility for tests and legacy calls.
     */
    setState(update, actionName = 'UPDATE') {
        const partial = typeof update === 'function' ? update(this.state) : update;

        if (partial.nodes !== undefined) nodeRepository.setNodes(partial.nodes);
        if (partial.connections !== undefined) nodeRepository.setConnections(partial.connections);
        if (partial.interaction !== undefined) {
            interactionState.setInteractionState(partial.interaction);
        }
        if (partial.camera !== undefined) {
            cameraState.setCamera(partial.camera);
        }

        // If it's a sync from sub-stores, we don't need to do anything else 
        // as the getter will already reflect the new state and notify() will be called by sub-store.
        if (actionName.includes('_SYNC')) {
            this._notify(this.state, actionName);
        } else {
            // If it's a direct call to DesignerStore.setState (like in tests)
            this._notify(this.state, actionName);
        }
    }

    /**
     * Block direct state assignment to ensure getter/setter logic is used.
     */
    set state(val) {
        // No-op or delegate if needed. For now, super.setState will call this.
        // We can just let it be or handle it.
    }

    /**
     * Aggregated state getter for backward compatibility.
     * Reconstructs the original expected state shape.
     */
    get state() {
        return {
            nodes: nodeRepository.state.nodes,
            connections: nodeRepository.state.connections,
            interaction: interactionState.state,
            camera: cameraState.state
        };
    }

    // ============ QUERIES (Delegated to NodeRepository) ============

    getNode(id) { return nodeRepository.getNode(id); }
    getAllNodes() { return nodeRepository.getAllNodes(); }
    getChildren(parentId) { return nodeRepository.getChildren(parentId); }
    getConnectionsFor(nodeId) { return nodeRepository.getConnectionsFor(nodeId); }

    // ============ ACTIONS (Delegated to NodeRepository) ============

    setNodes(nodes) {
        nodeRepository.setNodes(nodes);
        this.validateAndCleanup();
    }

    loadInitialNodes() {
        const newNodes = DesignerHydrator.generateInitialNodes(1200);
        nodeRepository.setNodes(newNodes);
        nodeRepository.setConnections([]);
    }

    addNode(isContainer, x, y, options = {}) {
        const nodeId = nodeRepository.addNode(isContainer, x, y, options);
        const node = nodeRepository.getNode(nodeId);

        if (isContainer && typeof ContainerBoxManager?.createUserBox === 'function') {
            const margin = 100;
            const bounds = { xMin: x - margin, xMax: x + margin, yMin: y - margin, yMax: y + margin };
            ContainerBoxManager.createUserBox(nodeId, bounds);
        }

        if (node && node.isStickyNote && this.onStickyNoteEdit) {
            this.onStickyNoteEdit(node);
        }

        return node;
    }

    addStickyNote(x, y, options = {}) {
        const nodeId = nodeRepository.addStickyNote(x, y, options);
        return nodeRepository.getNode(nodeId);
    }

    removeNode(nodeId) {
        return nodeRepository.removeNode(nodeId);
    }

    updateNode(nodeId, updates) {
        return nodeRepository.updateNode(nodeId, updates);
    }

    /**
     * Handle node drop (parenting/repelling) using Logic helper
     */
    dropNode(nodeId, containerId) {
        const originalNode = nodeRepository.getNode(nodeId);
        if (!originalNode) return;

        const siblings = nodeRepository.getChildren(containerId).filter(n => n.id !== nodeId);
        const { x, y } = DesignerLogic.calculateRepulsion({ ...originalNode }, siblings);

        nodeRepository.updateNode(nodeId, {
            parentId: containerId,
            x: x,
            y: y
        });
    }

    addConnection(fromId, toId, id = null) {
        return nodeRepository.addConnection(fromId, toId, id);
    }

    removeConnection(fromId, toId) {
        return nodeRepository.removeConnection(fromId, toId);
    }

    deleteConnection(connectionId) {
        return nodeRepository.deleteConnection(connectionId);
    }

    setConnections(connections) {
        nodeRepository.setConnections(connections);
    }

    // ============ INTERACTION (Delegated to InteractionState) ============

    setHover(nodeId) { interactionState.setHover(nodeId); }
    setDragging(nodeId) { interactionState.setDragging(nodeId); }
    startResize(nodeId, resizeState) { interactionState.startResize(nodeId, resizeState); }
    clearResize() { interactionState.clearResize(); }
    setDrawing(sourceNodeId) { interactionState.setDrawing(sourceNodeId); }
    setInteractionState(partial) { interactionState.setInteractionState(partial); }
    getInteractionState() { return interactionState.state; }
    cancelAllInteractions() { interactionState.cancelAllInteractions(); cameraState.setIsPanning(false); }
    selectNode(nodeId) { interactionState.selectNode(nodeId); }
    selectConnection(connectionId) { interactionState.selectConnection(connectionId); }
    clearSelection() { interactionState.clearSelection(); }

    // ============ CAMERA (Delegated to CameraState) ============

    setCamera(updates) { cameraState.setCamera(updates); }
    getCameraState() { return cameraState.state; }

    // ============ HIT DETECTION (Delegated to HitTester Service) ============

    findNodeAt(worldPos, excludeId = null, zoomScale = 1.0) {
        return HitTester.findNodeAt(worldPos, nodeRepository.state.nodes, zoomScale, excludeId);
    }

    findConnectionAt(worldPos) {
        return HitTester.findConnectionAt(worldPos, nodeRepository.state.connections, nodeRepository.state.nodes);
    }

    findDropTarget(draggingNodeId, zoomScale = 1.0) {
        const draggingNode = nodeRepository.getNode(draggingNodeId);
        if (!draggingNode) return null;
        return HitTester.findDropTarget({ x: draggingNode.x, y: draggingNode.y }, nodeRepository.state.nodes, draggingNodeId, zoomScale);
    }

    // ============ BOUNDS CACHING (Delegated to NodeRepository) ============

    getCachedBounds(nodeId, zoomScale = 1.0) { return nodeRepository.getCachedBounds(nodeId, zoomScale); }
    invalidateBoundsCache(nodeId) { nodeRepository.invalidateBoundsCache(nodeId); }
    clearBoundsCache() { nodeRepository.clearBoundsCache(); }

    // ============ HISTORY (Unified via HistoryManager) ============

    savepoint(actionType, metadata = {}) {
        HistoryManager.saveToHistory(nodeRepository.state.nodes, nodeRepository.state.connections, actionType, metadata);
    }

    undo() {
        const prev = HistoryManager.undo(nodeRepository.state.nodes, nodeRepository.state.connections);
        if (!prev) return false;
        HistoryManager.setRecording(false);
        nodeRepository.setNodes(prev.nodes);
        nodeRepository.setConnections(prev.connections);
        HistoryManager.setRecording(true);
        return true;
    }

    redo() {
        const next = HistoryManager.redo(nodeRepository.state.nodes, nodeRepository.state.connections);
        if (!next) return false;
        HistoryManager.setRecording(false);
        nodeRepository.setNodes(next.nodes);
        nodeRepository.setConnections(next.connections);
        HistoryManager.setRecording(true);
        return true;
    }

    canUndo() { return HistoryManager.canUndo(); }
    canRedo() { return HistoryManager.canRedo(); }
    clearHistory() { HistoryManager.clear(); }

    validateAndCleanup() {
        const nodes = nodeRepository.state.nodes;
        const connections = nodeRepository.state.connections;
        const ids = Object.keys(nodes);

        const newConnections = connections.filter(c => ids.includes(c.from) && ids.includes(c.to));
        let nodesChanged = false;
        const newNodes = { ...nodes };

        Object.values(newNodes).forEach(node => {
            if (node.parentId && !ids.includes(node.parentId)) {
                node.parentId = null;
                nodesChanged = true;
            }
        });

        if (newConnections.length !== connections.length) {
            nodeRepository.setConnections(newConnections);
        }
        if (nodesChanged) {
            nodeRepository.setNodes(newNodes);
        }
    }
}

export const DesignerStore = new DesignerStoreClass();

if (typeof window !== 'undefined') {
    window.DesignerStore = DesignerStore;
}
