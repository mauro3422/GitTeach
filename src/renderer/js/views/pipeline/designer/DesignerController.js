import { BaseController } from '../../../core/BaseController.js';
import { DesignerCanvas } from './DesignerCanvas.js';
import { DesignerInteraction } from './DesignerInteraction.js';
import { BlueprintManager } from './BlueprintManager.js';
import { HistoryManager } from './modules/HistoryManager.js';
import { ModalManager } from './modules/ModalManager.js';
import { RoutingDesignerStateLoader } from './RoutingDesignerStateLoader.js';
import { UIManager } from './UIManager.js';
import { CoordinateUtils } from './CoordinateUtils.js';
import { AnimationManager } from './AnimationManager.js';
import { DesignerStore } from './modules/DesignerStore.js';
import {
    commandManager,
    AddNodeCommand,
    AddStickyNoteCommand,
    DeleteNodeCommand,
    UpdateLabelCommand,
    CreateConnectionCommand,
    MoveNodeCommand,
    DropNodeCommand
} from './commands/DesignerCommands.js';
// Removed direct DragHandler import, accessed via DesignerInteraction
import { globalEventBus } from '../../../core/EventBus.js';

class DesignerControllerClass extends BaseController {
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
        this.registerDisposable(
            DesignerStore.subscribe(() => this.render())
        );

        // 2. Event-driven rendering subscription
        this.registerDisposable(
            globalEventBus.on('designer:render:request', () => this.render())
        );

        // 4. Global Event Listener for debugging (wildcard support verification)
        this.registerDisposable(
            globalEventBus.on('*', console.log)
        );

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
            () => DesignerStore.state.nodes, // Pass as FUNCTION from Store
            () => this.render(),
            (fromId, toId) => this.addManualConnection(fromId, toId),
            (node) => this.openMessageModal(node),
            (nodeId, containerId) => this.handleNodeDrop(nodeId, containerId),
            (note) => this.openInlineEditor(note),
            () => BlueprintManager.autoSave(DesignerStore.state.nodes, DesignerStore.state.connections)
        );
        BlueprintManager.init(DesignerStore.state.nodes);
    }

    openMessageModal(node) {
        if (node.isStickyNote) {
            this.openInlineEditor(node);
            return;
        }

        DesignerInteraction.cancelInteraction();
        ModalManager.openMessageModal(
            node,
            DesignerStore.state.nodes,
            (msg, pId, label) => this.saveMessage(msg, pId, label),
            () => ModalManager.closeModal()
        );
    }

    closeModal() {
        ModalManager.closeModal();
    }

    saveToHistory() {
        DesignerStore.savepoint();
    }

    undo() {
        if (DesignerStore.undo()) {
            this.render();
            console.log('[DesignerController] Undo executed via Store');
        }
    }

    redo() {
        if (DesignerStore.redo()) {
            this.render();
            console.log('[DesignerController] Redo executed via Store');
        }
    }

    addCustomNode(isContainer) {
        const centerPos = CoordinateUtils.getCanvasCenterWorldPos(this.canvas, DesignerInteraction.state);
        const command = new AddNodeCommand(isContainer, centerPos.x, centerPos.y);

        commandManager.execute(command);
        this.render();
    }

    addStickyNote() {
        const centerPos = CoordinateUtils.getCanvasCenterWorldPos(this.canvas, DesignerInteraction.state);
        const command = new AddStickyNoteCommand(centerPos.x, centerPos.y);

        const newNote = commandManager.execute(command);
        this.render();

        // Use safe timeout from BaseController
        if (newNote) {
            this.setTimeout(() => this.openInlineEditor(newNote), 100);
        }
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
        DesignerStore.dropNode(nodeId, containerId);
        this.render();
        BlueprintManager.autoSave(DesignerStore.state.nodes, DesignerStore.state.connections);
    }

    saveMessage(message, parentId, newLabel = null) {
        if (!ModalManager.editingNode) return;
        this.saveToHistory();
        ModalManager.editingNode.message = message;
        ModalManager.editingNode.parentId = parentId;
        if (newLabel) ModalManager.editingNode.label = newLabel;

        this.closeModal();
        this.render();
        BlueprintManager.autoSave(DesignerStore.state.nodes, DesignerStore.state.connections);
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    }

    addManualConnection(fromId, toId) {
        this.saveToHistory();
        DesignerStore.addConnection(fromId, toId);
        this.render();
        BlueprintManager.autoSave(DesignerStore.state.nodes, DesignerStore.state.connections);
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

        // Use unified composite rendering (Defensive sanity check)
        const activeConnId = (DesignerInteraction.activeConnection && DesignerInteraction.activeConnection.fromNode)
            ? DesignerInteraction.activeConnection.fromNode.id
            : null;

        const activeConn = DesignerInteraction.activeConnection || null;

        const dropTargetId = (DesignerInteraction.dragStrategy && DesignerInteraction.dragStrategy.dragState)
            ? DesignerInteraction.dragStrategy.dragState.dropTargetId
            : null;

        const resizingNodeId = (DesignerInteraction.resizeHandler && typeof DesignerInteraction.resizeHandler.getState === 'function')
            ? (DesignerInteraction.resizeHandler.getState() || {}).resizingNodeId
            : null;

        DesignerCanvas.render(
            this.canvas.width,
            this.canvas.height,
            DesignerStore.state.nodes,
            navState,
            DesignerStore.state.connections,
            activeConnId,
            activeConn,
            DesignerInteraction.hoveredNodeId,
            dropTargetId,
            resizingNodeId
        );

        // Sync inline editor if active
        ModalManager.syncNoteEditorPosition();

        // Check for container animations
        this.checkAnimations();
    }

    checkAnimations() {
        const hasAnimating = Object.values(DesignerStore.state.nodes).some(node => {
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
export const RoutingDesigner = new DesignerControllerClass();
