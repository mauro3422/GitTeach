import { Store } from '../../../../core/Store.js';
import { HistoryManager } from './HistoryManager.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { DesignerHydrator } from './DesignerHydrator.js';
import { DesignerLogic } from './DesignerLogic.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';

class DesignerStoreClass extends Store {
    constructor() {
        super({
            nodes: {},
            connections: [],
            // NOTE: Navigation state (zoom/pan) lives in PanZoomHandler, accessed via DesignerInteraction.state
            // NOTE: Dragging/Resizing state lives in DragStrategy/ResizeHandler respectively
            interaction: {
                hoveredNodeId: null,
                selectedNodeId: null,
                selectedConnectionId: null
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
    }

    /**
     * Load initial pipeline nodes using Hydrator
     */
    loadInitialNodes() {
        const newNodes = DesignerHydrator.generateInitialNodes(1200);
        this.setState({ nodes: newNodes, connections: [] }, 'LOAD_INITIAL_NODES');
    }

    /**
     * Add a custom node
     */
    addNode(isContainer, x, y, options = {}) {
        const typeLabel = isContainer ? 'Box' : 'Node';
        const count = Object.keys(this.state.nodes).filter(k => k.startsWith('custom_')).length + 1;
        const name = options.label || `${typeLabel} ${count}`;
        const id = options.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const newNode = {
            id, x, y,
            label: name,
            icon: isContainer ? '📦' : '🧩',
            isRepoContainer: isContainer,
            description: options.description || `Elemento personalizado: ${name}`,
            internalClasses: [],
            ...options
        };
        DesignerHydrator.ensureDimensions(newNode, options);

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
     * Add a sticky note
     */
    addStickyNote(x, y, options = {}) {
        const id = options.id || `sticky_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newNode = {
            id, x, y,
            label: options.label || 'Nota',
            text: options.text || 'Doble click para editar...',
            isStickyNote: true,
            dimensions: { w: 180, h: 100, animW: 180, animH: 100, targetW: 180, targetH: 100 }
        };

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
        this.setState({ connections: [...connections] }, 'SET_CONNECTIONS');
    }

    // --- State Accessors ---

    setInteractionState(partial) { this.setState({ interaction: { ...this.state.interaction, ...partial } }, 'INTERACTION_UPDATE'); }

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
        const nodeList = this.getAllNodes();

        // PERF: Iterate backwards without .slice().reverse() (saves allocation)
        // 1. Sticky Notes (Top-most)
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];
            if (excludeId && node.id === excludeId) continue;
            if (!node.isStickyNote) continue;

            // Usar límites visuales para detección precisa (con un canvas dummy si es necesario para medir)
            const bounds = GeometryUtils.getStickyNoteBounds(node, null, zoomScale);
            const m = ThemeManager.geometry.thresholds.nodeHitBuffer;
            // Corregir coordenadas para que coincidan con el sistema de detección de rectángulos
            // bounds.centerX y bounds.centerY son las coordenadas del centro
            if (GeometryUtils.isPointInRectangle(worldPos, {
                x: bounds.centerX - (bounds.renderW + m * 2) / 2,
                y: bounds.centerY - (bounds.renderH + m * 2) / 2,
                w: bounds.renderW + m * 2,
                h: bounds.renderH + m * 2
            })) return node;
        }

        // 2. Regular Nodes
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];
            if (excludeId && node.id === excludeId || node.isRepoContainer || node.isStickyNote) continue;
            if (GeometryUtils.isPointInNode(worldPos, node, zoomScale)) return node;
        }

        // 3. Containers (Bottom-most)
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];
            if (excludeId && node.id === excludeId || !node.isRepoContainer) continue;
            const bounds = GeometryUtils.getContainerBounds(node, this.state.nodes, zoomScale);
            // Usar el mismo sistema de detección que sticky notes para consistencia
            const m = ThemeManager.geometry.thresholds.nodeHitBuffer;
            if (GeometryUtils.isPointInRectangle(worldPos, {
                x: bounds.centerX - (bounds.renderW + m * 2) / 2,
                y: bounds.centerY - (bounds.renderH + m * 2) / 2,
                w: bounds.renderW + m * 2,
                h: bounds.renderH + m * 2
            })) return node;
        }

        return null;
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

    // --- History & Undo/Redo ---

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

    // --- Override & Validation ---

    setState(updates, actionName = 'DESIGNER_UPDATE') {
        const nextState = { ...this.state };
        let changed = false;

        ['nodes', 'connections', 'interaction'].forEach(key => {
            if (updates[key]) {
                nextState[key] = key === 'nodes' ? { ...updates[key] } : (Array.isArray(updates[key]) ? [...updates[key]] : { ...nextState[key], ...updates[key] });
                changed = true;
            }
        });

        // Allow unknown keys
        Object.keys(updates).forEach(k => {
            if (!['nodes', 'connections', 'interaction'].includes(k)) {
                nextState[k] = updates[k];
                changed = true;
            }
        });

        if (changed) super.setState(nextState, actionName);
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
