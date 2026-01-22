import { BaseController } from '../../../core/BaseController.js';
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
import { DragHandler } from './interaction/DragHandler.js';

class RoutingDesignerController extends BaseController {
    constructor() {
        super();
        this.canvas = null;
        this.ctx = null;
    }

    async init(canvasId) {
        super.init({ canvasId });
        this.setupCanvas(canvasId);
        this.initializeModules();
        this.initializeSubModules();

        // Initialize animation manager
        AnimationManager.setRenderCallback(() => this.render());

        // Lifecycle: MOUNT (Start listening to events)
        this.mount();

        await RoutingDesignerStateLoader.loadAndHydrate();
        UIManager.init(this);
    }

    /**
     * Mount logic: Event listeners and subscriptions
     */
    mount() {
        super.mount();

        // 1. Subscribe to Store
        // registerDisposable ensures it cleans up on destroy()
        this.registerDisposable(
            DesignerStore.subscribe(() => this.render())
        );

        // 2. Window Resize Listener
        const resizeHandler = () => this.resize();
        window.addEventListener('resize', resizeHandler);
        this.registerDisposable(() => window.removeEventListener('resize', resizeHandler));

        // Initial resize to set correct dimensions
        this.resize();
    }

    /**
     * Configura el canvas básico
     */
    setupCanvas(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`[RoutingDesigner] Canvas element '${canvasId}' not found during setup.`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Inicializa los módulos principales
     */
    initializeModules() {
        HistoryManager.clear();
        ModalManager.editingNode = null;
    }

    /**
     * Inicializa submódulos del designer
     */
    initializeSubModules() {
        if (!this.ctx) return;

        DesignerCanvas.init(this.ctx);
        DesignerInteraction.init(
            this.canvas,
            () => NodeManager.nodes, // Pass as FUNCTION, not Object Reference
            () => this.render(),
            (fromId, toId) => this.addManualConnection(fromId, toId),
            (node) => this.openMessageModal(node),
            (nodeId, containerId) => this.handleNodeDrop(nodeId, containerId),
            (note) => this.openInlineEditor(note),
            () => BlueprintManager.autoSave(NodeManager.nodes, ConnectionManager.connections)
        );
        BlueprintManager.init(NodeManager.nodes);
    }

    openMessageModal(node) {
        if (node.isStickyNote) {
            this.openInlineEditor(node);
            return;
        }

        DesignerInteraction.cancelInteraction();
        ModalManager.openMessageModal(
            node,
            NodeManager.nodes,
            (msg, pId, label) => this.saveMessage(msg, pId, label),
            () => ModalManager.closeModal()
        );
    }

    closeModal() {
        ModalManager.closeModal();
    }

    saveToHistory() {
        HistoryManager.saveToHistory(NodeManager.nodes, ConnectionManager.connections);
    }

    undo() {
        const prevState = HistoryManager.undo(NodeManager.nodes, ConnectionManager.connections);
        if (prevState) {
            NodeManager.setNodes(prevState.nodes);
            ConnectionManager.setConnections(prevState.connections);
            this.render();
            // console.log('[RoutingDesigner] Undo');
        }
    }

    redo() {
        const redoState = HistoryManager.redo(NodeManager.nodes, ConnectionManager.connections);
        if (redoState) {
            NodeManager.setNodes(redoState.nodes);
            ConnectionManager.setConnections(redoState.connections);
            this.render();
            // console.log('[RoutingDesigner] Redo');
        }
    }

    addCustomNode(isContainer) {
        this.saveToHistory();
        const centerPos = CanvasUtils.getCanvasCenterWorldPos(this.canvas, DesignerInteraction.state);

        NodeManager.addCustomNode(isContainer, centerPos.x, centerPos.y);
        this.render();
    }

    addStickyNote() {
        this.saveToHistory();
        const centerPos = CanvasUtils.getCanvasCenterWorldPos(this.canvas, DesignerInteraction.state);

        const newNote = NodeManager.addStickyNote(centerPos.x, centerPos.y);
        this.render();
        // Use safe timeout from BaseController
        this.setTimeout(() => this.openInlineEditor(newNote), 100);
    }

    openInlineEditor(note) {
        ModalManager.openInlineEditor(note, (note, newText) => {
            this.saveToHistory();
            note.text = newText || 'Nota vacía';
            this.render();
        });
    }

    handleNodeDrop(nodeId, containerId) {
        this.saveToHistory();
        NodeManager.handleNodeDrop(nodeId, containerId);
        this.render();
        BlueprintManager.autoSave(NodeManager.nodes, ConnectionManager.connections);
    }

    saveMessage(message, parentId, newLabel = null) {
        if (!ModalManager.editingNode) return;
        this.saveToHistory();
        ModalManager.editingNode.message = message;
        ModalManager.editingNode.parentId = parentId;
        if (newLabel) ModalManager.editingNode.label = newLabel;

        this.closeModal();
        this.render();
        BlueprintManager.autoSave(NodeManager.nodes, ConnectionManager.connections);
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    }

    addManualConnection(fromId, toId) {
        this.saveToHistory();
        ConnectionManager.addConnection(fromId, toId);
        this.render();
        BlueprintManager.autoSave(NodeManager.nodes, ConnectionManager.connections);
    }

    render() {
        if (!this.ctx) return;

        let navState = null;
        try {
            navState = DesignerInteraction.state;
        } catch (e) {
            console.warn('[RoutingDesigner] Interaction state access failed:', e);
        }

        if (!navState || !navState.panOffset) {
            // Fallback to prevent crash during init
            // console.warn('[RoutingDesigner] Waiting for navigation state...');
            return;
        }

        // Use unified composite rendering
        DesignerCanvas.render(
            this.canvas.width,
            this.canvas.height,
            NodeManager.nodes,
            navState,
            ConnectionManager.connections,
            DesignerInteraction.activeConnection?.fromNode?.id,
            DesignerInteraction.activeConnection,
            DesignerInteraction.hoveredNodeId,
            DragHandler.state.dropTargetId // PASS DROP TARGET EXPLICITLY
        );

        // Sync inline editor if active
        ModalManager.syncNoteEditorPosition();

        // Check for container animations
        this.checkAnimations();
    }

    checkAnimations() {
        const hasAnimating = Object.values(NodeManager.nodes).some(node => {
            if (!node.isRepoContainer || !node.dimensions || node.dimensions.isManual) return false;
            const d = node.dimensions;
            const isSizing = Math.abs(d.animW - d.targetW) > 1 || Math.abs(d.animH - d.targetH) > 1;
            const isPulsing = d.transitionPadding > 0.5;
            return isSizing || isPulsing;
        });

        if (hasAnimating && !AnimationManager.hasActiveAnimations()) {
            AnimationManager.registerTween({
                id: 'container-animations',
                animate: () => {
                    this.render(); // Just trigger render, render() checks logic again
                    // Optimization: logic is slightly duplicated but acceptable for now
                    // to keep render loop pure
                }
            });
        }
    }
}

// Export singleton to maintain API
export const RoutingDesigner = new RoutingDesignerController();
