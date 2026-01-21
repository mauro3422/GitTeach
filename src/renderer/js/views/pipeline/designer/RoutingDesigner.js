import { DesignerCanvas } from './DesignerCanvas.js';
import { DesignerInteraction } from './DesignerInteraction.js';
import { BlueprintManager } from './BlueprintManager.js';
import { NodeManager } from './modules/NodeManager.js';
import { ConnectionManager } from './modules/ConnectionManager.js';
import { HistoryManager } from './modules/HistoryManager.js';
import { ModalManager } from './modules/ModalManager.js';
import { RoutingDesignerStateLoader } from './RoutingDesignerStateLoader.js';
import { UIManager } from './UIManager.js';
import { CanvasUtils } from './CanvasUtils.js';
import { AnimationManager } from './AnimationManager.js';
import { DesignerStore } from './modules/DesignerStore.js';

export const RoutingDesigner = {
    canvas: null,
    ctx: null,

    async init(canvasId) {
        this.setupCanvas(canvasId);
        this.initializeModules();
        this.initializeSubModules(); // Ensure submodules and context are ready

        // Connect store to render loop AFTER submodules are initialized
        DesignerStore.subscribe(() => this.render());

        // Initialize animation manager
        AnimationManager.setRenderCallback(() => this.render());

        await RoutingDesignerStateLoader.loadAndHydrate();
        this.setupResizeHandler();
        UIManager.init(this);
    },

    /**
     * Configura el canvas básico
     */
    setupCanvas(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    },

    /**
     * Inicializa los módulos principales
     */
    initializeModules() {
        HistoryManager.clear();
        ModalManager.editingNode = null;
    },

    /**
     * Inicializa submódulos del designer
     */
    initializeSubModules() {
        DesignerCanvas.init(this.ctx);
        DesignerInteraction.init(
            this.canvas,
            NodeManager.nodes,
            () => this.render(),
            (fromId, toId) => this.addManualConnection(fromId, toId),
            (node) => this.openMessageModal(node),
            (nodeId, containerId) => this.handleNodeDrop(nodeId, containerId),
            (note) => this.openInlineEditor(note),
            () => BlueprintManager.autoSave(NodeManager.nodes, ConnectionManager.connections)
        );
        BlueprintManager.init(NodeManager.nodes);
    },

    /**
     * Configura el handler de resize
     */
    setupResizeHandler() {
        window.addEventListener('resize', () => this.resize());
        this.resize();
    },

    openMessageModal(node) {
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

    saveToHistory() {
        HistoryManager.saveToHistory(NodeManager.nodes, ConnectionManager.connections);
    },

    undo() {
        const prevState = HistoryManager.undo(NodeManager.nodes, ConnectionManager.connections);
        if (prevState) {
            NodeManager.setNodes(prevState.nodes);
            ConnectionManager.setConnections(prevState.connections);
            // No interaction.nodes update needed, it's a getter now
            this.render();
            console.log('[RoutingDesigner] Undo');
        }
    },

    redo() {
        const redoState = HistoryManager.redo(NodeManager.nodes, ConnectionManager.connections);
        if (redoState) {
            NodeManager.setNodes(redoState.nodes);
            ConnectionManager.setConnections(redoState.connections);
            this.render();
            console.log('[RoutingDesigner] Redo');
        }
    },

    addCustomNode(isContainer) {
        this.saveToHistory();
        const canvas = document.getElementById('designer-canvas');
        const centerPos = CanvasUtils.getCanvasCenterWorldPos(canvas, DesignerInteraction.state);

        const newNode = NodeManager.addCustomNode(isContainer, centerPos.x, centerPos.y);
        this.render();
    },

    addStickyNote() {
        this.saveToHistory();
        const canvas = document.getElementById('designer-canvas');
        const centerPos = CanvasUtils.getCanvasCenterWorldPos(canvas, DesignerInteraction.state);

        const newNote = NodeManager.addStickyNote(centerPos.x, centerPos.y);
        this.render();
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
        if (newLabel) ModalManager.editingNode.label = newLabel;

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

        // Use unified composite rendering
        DesignerCanvas.render(
            this.canvas.width,
            this.canvas.height,
            NodeManager.nodes,
            navState,
            ConnectionManager.connections,
            DesignerInteraction.activeConnection?.fromNode?.id,
            DesignerInteraction.activeConnection
        );

        // Check for container animations and register with AnimationManager
        const hasAnimating = Object.values(NodeManager.nodes).some(node => {
            if (!node.isRepoContainer || !node.dimensions || node.dimensions.isManual) return false;
            const d = node.dimensions;
            return Math.abs(d.animW - d.targetW) > 1 || Math.abs(d.animH - d.targetH) > 1;
        });

        if (hasAnimating && !AnimationManager.hasActiveAnimations()) {
            // Register container animation tween
            AnimationManager.registerTween({
                id: 'container-animations',
                animate: () => {
                    // Check if animations are still needed
                    const stillAnimating = Object.values(NodeManager.nodes).some(node => {
                        if (!node.isRepoContainer || !node.dimensions || node.dimensions.isManual) return false;
                        const d = node.dimensions;
                        return Math.abs(d.animW - d.targetW) > 1 || Math.abs(d.animH - d.targetH) > 1;
                    });

                    if (!stillAnimating) {
                        AnimationManager.unregisterTween({ id: 'container-animations' });
                    }
                }
            });
        }
    }
};
