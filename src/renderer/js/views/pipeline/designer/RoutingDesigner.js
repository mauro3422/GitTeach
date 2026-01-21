import { DesignerCanvas } from './DesignerCanvas.js';
import { DesignerInteraction } from './DesignerInteraction.js';
import { BlueprintManager } from './BlueprintManager.js';
import { NodeManager } from './modules/NodeManager.js';
import { ConnectionManager } from './modules/ConnectionManager.js';
import { HistoryManager } from './modules/HistoryManager.js';
import { ModalManager } from './modules/ModalManager.js';

export const RoutingDesigner = {
    canvas: null,
    ctx: null,

    async init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Initialize modules
        NodeManager.init({});
        ConnectionManager.init([]);
        HistoryManager.clear();
        ModalManager.editingNode = null;

        // Load Initial State
        NodeManager.loadInitialNodes();

        // MERGE with File System / LocalStorage if exists
        const savedState = await BlueprintManager.loadFromLocalStorage();
        if (savedState && savedState.layout) {
            console.log('[RoutingDesigner] Hydrating from saved blueprint...');
            const scale = 1200;
            Object.entries(savedState.layout).forEach(([id, data]) => {
                const existingNode = NodeManager.getNode(id);
                if (existingNode) {
                    // Update existing nodes (positions, labels, messages, parents)
                    existingNode.x = data.x * scale;
                    existingNode.y = data.y * scale;
                    existingNode.label = data.label;
                    existingNode.message = data.message;
                    existingNode.parentId = data.parentId;
                    existingNode.width = data.width;
                    existingNode.height = data.height;
                    existingNode.manualWidth = data.manualWidth;
                    existingNode.manualHeight = data.manualHeight;
                    if (data.isStickyNote) {
                        existingNode.text = data.text;
                    }
                } else {
                    // Create custom/lost nodes
                    NodeManager.nodes[id] = {
                        id,
                        x: data.x * scale,
                        y: data.y * scale,
                        label: data.label,
                        message: data.message,
                        parentId: data.parentId,
                        icon: data.isStickyNote ? '📝' : (data.isRepoContainer ? '📦' : '🧩'),
                        color: data.color || '#30363d',
                        isRepoContainer: data.isRepoContainer,
                        isStickyNote: data.isStickyNote,
                        text: data.text,
                        width: data.width,
                        height: data.height,
                        manualWidth: data.manualWidth,
                        manualHeight: data.manualHeight,
                        isSatellite: data.isSatellite,
                        orbitParent: data.orbitParent
                    };
                }

                // CRITICAL FIX: Re-register dynamic containers in ContainerBoxManager
                // This ensures that user-created boxes persist across sessions
                if (data.isRepoContainer && id.startsWith('custom_')) {
                    const width = (data.manualWidth || data.width || 180);
                    const height = (data.manualHeight || data.height || 100);
                    const bounds = {
                        minX: (data.x * scale) - width / 2,
                        minY: (data.y * scale) - height / 2,
                        maxX: (data.x * scale) + width / 2,
                        maxY: (data.y * scale) + height / 2
                    };
                    // Note: ContainerBoxManager is imported in NodeManager
                    console.log(`[RoutingDesigner] Re-registered container ${id} in ContainerBoxManager`);
                }
            });
            ConnectionManager.setConnections(Array.isArray(savedState.connections) ? savedState.connections : []);
        }

        // Init Sub-Modules
        DesignerCanvas.init(this.ctx);
        DesignerInteraction.init(
            this.canvas,
            NodeManager.nodes,
            () => this.render(),
            (fromId, toId) => this.addManualConnection(fromId, toId),
            (node) => this.openMessageModal(node),
            (nodeId, containerId) => this.handleNodeDrop(nodeId, containerId),
            (note) => this.openInlineEditor(note), // Sticky note double-click
            () => BlueprintManager.autoSave(NodeManager.nodes, ConnectionManager.connections) // onInteractionEnd
        );
        BlueprintManager.init(NodeManager.nodes);

        // Resize and initial render
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // UI Events
        const saveBtn = document.getElementById('save-blueprint');
        const resetBtn = document.getElementById('reset-layout');
        const addNodeBtn = document.getElementById('add-node');
        const addContBtn = document.getElementById('add-container');

        if (saveBtn) saveBtn.onclick = () => BlueprintManager.save(ConnectionManager.connections, NodeManager.nodes);

        if (resetBtn) {
            resetBtn.onclick = () => {
                NodeManager.loadInitialNodes();
                ConnectionManager.clear();
                DesignerInteraction.state.panOffset = { x: 0, y: 0 };
                DesignerInteraction.state.zoomScale = 1.0;
                this.render();
            };
        }

        if (addNodeBtn) addNodeBtn.onclick = () => this.addCustomNode(false);
        if (addContBtn) addContBtn.onclick = () => this.addCustomNode(true);

        const addStickyBtn = document.getElementById('add-sticky');
        if (addStickyBtn) addStickyBtn.onclick = () => this.addStickyNote();

        // Toolbox Drawer Toggle
        const toolboxToggle = document.getElementById('toolbox-toggle');
        const toolboxDrawer = document.getElementById('toolbox-drawer');
        const toolboxClose = document.getElementById('toolbox-close');

        if (toolboxToggle && toolboxDrawer) {
            toolboxToggle.onclick = () => {
                toolboxDrawer.classList.add('open');
                toolboxToggle.style.display = 'none';
            };
        }
        if (toolboxClose && toolboxDrawer && toolboxToggle) {
            toolboxClose.onclick = () => {
                toolboxDrawer.classList.remove('open');
                toolboxToggle.style.display = 'flex';
            };
        }

        // Global interactions might need overlay
        document.getElementById('modal-overlay').onclick = () => this.closeModal();

        // Undo/Redo Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });
    },

    openMessageModal(node) {
        // Step 1: Interaction Cleanup
        DesignerInteraction.cancelInteraction();

        ModalManager.openMessageModal(
            node,
            NodeManager.nodes,
            (msg, pId, label) => this.saveMessage(msg, pId, label),
            () => ModalManager.closeModal()
        );
    },

    closeModal() {
        ModalManager.closeModal();
    },

    // Save current state to history (before making changes)
    saveToHistory() {
        HistoryManager.saveToHistory(NodeManager.nodes, ConnectionManager.connections);
    },

    undo() {
        const prevState = HistoryManager.undo(NodeManager.nodes, ConnectionManager.connections);
        if (prevState) {
            NodeManager.setNodes(prevState.nodes);
            ConnectionManager.setConnections(prevState.connections);
            DesignerInteraction.nodes = NodeManager.nodes;
            this.render();
            console.log('[RoutingDesigner] Undo');
        }
    },

    redo() {
        const redoState = HistoryManager.redo(NodeManager.nodes, ConnectionManager.connections);
        if (redoState) {
            NodeManager.setNodes(redoState.nodes);
            ConnectionManager.setConnections(redoState.connections);
            DesignerInteraction.nodes = NodeManager.nodes;
            this.render();
            console.log('[RoutingDesigner] Redo');
        }
    },

    addCustomNode(isContainer) {
        this.saveToHistory();

        const canvas = document.getElementById('designer-canvas');
        const centerX = (canvas.width / 2 - DesignerInteraction.state.panOffset.x) / DesignerInteraction.state.zoomScale;
        const centerY = (canvas.height / 2 - DesignerInteraction.state.panOffset.y) / DesignerInteraction.state.zoomScale;

        const newNode = NodeManager.addCustomNode(isContainer, centerX, centerY);
        DesignerInteraction.nodes = NodeManager.nodes;

        this.render();
        console.log(`[RoutingDesigner] Added ${isContainer ? 'Box' : 'Node'}: ${newNode.label}`);
    },

    addStickyNote() {
        this.saveToHistory();

        const canvas = document.getElementById('designer-canvas');
        const centerX = (canvas.width / 2 - DesignerInteraction.state.panOffset.x) / DesignerInteraction.state.zoomScale;
        const centerY = (canvas.height / 2 - DesignerInteraction.state.panOffset.y) / DesignerInteraction.state.zoomScale;

        const newNote = NodeManager.addStickyNote(centerX, centerY);
        DesignerInteraction.nodes = NodeManager.nodes;
        this.render();
        console.log(`[RoutingDesigner] Added sticky note: ${newNote.id}`);

        // Immediately open inline editor
        setTimeout(() => this.openInlineEditor(newNote), 100);
    },

    openInlineEditor(note) {
        ModalManager.openInlineEditor(note, (note, newText) => {
            this.saveToHistory();
            note.text = newText || 'Nota vacía';
            this.render();
        });
    },

    handleNodeDrop(nodeId, containerId) {
        this.saveToHistory();
        NodeManager.handleNodeDrop(nodeId, containerId);
        this.render();
        BlueprintManager.autoSave(NodeManager.nodes, ConnectionManager.connections);
    },



    saveMessage(message, parentId, newLabel = null) {
        if (!ModalManager.editingNode) return;

        this.saveToHistory();

        ModalManager.editingNode.message = message;
        ModalManager.editingNode.parentId = parentId;
        if (newLabel) {
            ModalManager.editingNode.label = newLabel;
        }

        this.closeModal();
        this.render();
        BlueprintManager.autoSave(NodeManager.nodes, ConnectionManager.connections);
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    },

    addManualConnection(fromId, toId) {
        this.saveToHistory();
        ConnectionManager.addConnection(fromId, toId);
        this.render();
        BlueprintManager.autoSave(NodeManager.nodes, ConnectionManager.connections);
    },

    render() {
        if (!this.ctx) return;
        const navState = DesignerInteraction.state;

        DesignerCanvas.drawGrid(this.canvas.width, this.canvas.height, navState);

        // DRAW NODES FIRST (containers in background, regular nodes in foreground)
        DesignerCanvas.drawNodes(NodeManager.nodes, navState, DesignerInteraction.activeConnection?.fromNode?.id);

        // DRAW UI LABELS (Directly on screen coordinates)
        DesignerCanvas.drawUI(NodeManager.nodes, navState);

        // DRAW MANUAL CONNECTIONS ON TOP (so they're visible over containers)
        ConnectionManager.connections.forEach(conn => {
            const startNode = NodeManager.getNode(conn.from);
            const endNode = NodeManager.getNode(conn.to);
            if (startNode && endNode) {
                DesignerCanvas.drawSimpleLine(startNode, endNode, navState, NodeManager.nodes);
            }
        });

        // DRAW ACTIVE CONNECTION (While dragging)
        if (DesignerInteraction.activeConnection) {
            DesignerCanvas.drawActiveLine(
                DesignerInteraction.activeConnection.fromNode,
                DesignerInteraction.activeConnection.currentPos,
                navState
            );
        }

        // ANIMATION LOOP: Check if any container is still animating
        const hasAnimating = Object.values(NodeManager.nodes).some(node => {
            if (!node.isRepoContainer || node.manualWidth) return false;
            // If animated size differs from target by more than 1px, still animating
            return node._animW !== undefined && (
                Math.abs(node._animW - (node._targetW || node._animW)) > 1 ||
                Math.abs(node._animH - (node._targetH || node._animH)) > 1
            );
        });

        if (hasAnimating && !this._animationFrameId) {
            this._animationFrameId = requestAnimationFrame(() => {
                this._animationFrameId = null;
                this.render();
            });
        }
    }
};
