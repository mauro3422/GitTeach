import { BaseController } from '../../../core/BaseController.js';
import { DesignerCanvas } from './DesignerCanvas.js';
import { DesignerInteraction } from './DesignerInteraction.js';
import { BlueprintManager } from './BlueprintManager.js';
import { HistoryManager } from './modules/HistoryManager.js';
import { ModalController } from './modules/ModalController.js';
import { InlineEditor } from './interaction/InlineEditor.js';
import { DesignerLoader } from './modules/DesignerLoader.js';
import { UIManager } from './UIManager.js';
import { CoordinateUtils } from './CoordinateUtils.js';
import { AnimationManager } from './AnimationManager.js';
import { DesignerStore } from './modules/DesignerStore.js';
import { cameraState } from './modules/stores/CameraState.js';
import { DESIGNER_CONSTANTS } from './DesignerConstants.js';
import {
    commandManager,
    AddNodeCommand,
    AddStickyNoteCommand,
    DeleteNodeCommand,
    UpdateLabelCommand,
    CreateConnectionCommand,
    MoveNodeCommand,
    DropNodeCommand,
    DeleteConnectionCommand
} from './commands/DesignerCommands.js';
// Removed direct DragHandler import, accessed via DesignerInteraction
import { DesignerEvents } from './core/DesignerEvents.js';

class DesignerControllerClass extends BaseController {
    constructor() {
        super();
        this.rafPending = false; // RAF batching flag
        this.rafId = null;
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

        try {
            await DesignerLoader.loadAndHydrate();
        } catch (e) {
            console.error('[DesignerController] Failed to load blueprint on init:', e);
            console.warn('[DesignerController] Proceeding with empty canvas');
            // Fall back to initial nodes (already loaded by DesignerStore.loadInitialNodes)
            // No throw - continue with empty state
        }
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
            DesignerEvents.on('designer:render:request', () => this.render())
        );

        // 4. Global Event Listener for debugging (wildcard support verification)
        this.registerDisposable(
            DesignerEvents.on('*', console.log)
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
        ModalController.editingNode = null;
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
            () => BlueprintManager.autoSave(DesignerStore.state.nodes, DesignerStore.state.connections),
            () => this.deleteSelectedNode()
        );
        BlueprintManager.init(DesignerStore.state.nodes);
    }

    openMessageModal(node) {
        if (node.isStickyNote) {
            this.openInlineEditor(node);
            return;
        }

        DesignerInteraction.cancelInteraction();
        ModalController.openMessageModal(
            node,
            DesignerStore.state.nodes,
            (msg, pId, label) => this.saveMessage(msg, pId, label),
            () => ModalController.closeModal()
        );
    }

    closeModal() {
        ModalController.closeModal();
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
        const centerPos = CoordinateUtils.getCanvasCenterWorldPos(this.canvas, cameraState.state);
        const command = new AddNodeCommand(isContainer, centerPos.x, centerPos.y);

        commandManager.execute(command);
        this.render();
    }

    addStickyNote() {
        const centerPos = CoordinateUtils.getCanvasCenterWorldPos(this.canvas, cameraState.state);
        const command = new AddStickyNoteCommand(centerPos.x, centerPos.y);

        const newNote = commandManager.execute(command);
        this.render();

        // Use safe timeout with node existence validation
        if (newNote) {
            const noteId = newNote.id;
            this.setTimeout(() => {
                const node = DesignerStore.getNode(noteId);
                if (node) {
                    this.openInlineEditor(node);
                } else {
                    console.warn('[DesignerController] Sticky note was deleted before inline editor could open:', noteId);
                }
            }, 100);
        }
    }

    openInlineEditor(note) {
        InlineEditor.open(note, (note, newText) => {
            this.saveToHistory();
            note.text = newText || 'Nota vacía';
            this.render();
        });
    }

    deleteSelectedNode() {
        const selectedId = DesignerStore.state.interaction.selectedNodeId;
        const selectedConnId = DesignerStore.state.interaction.selectedConnectionId;

        if (selectedId) {
            console.log(`[DesignerController] Deleting selected node: ${selectedId}`);
            const command = new DeleteNodeCommand(selectedId);
            commandManager.execute(command);
            DesignerStore.clearSelection();
            this.render();
            BlueprintManager.autoSave(DesignerStore.state.nodes, DesignerStore.state.connections);
        } else if (selectedConnId) {
            console.log(`[DesignerController] Deleting selected connection: ${selectedConnId}`);
            const command = new DeleteConnectionCommand(selectedConnId);
            commandManager.execute(command);
            DesignerStore.clearSelection();
            this.render();
            BlueprintManager.autoSave(DesignerStore.state.nodes, DesignerStore.state.connections);
        }
    }

    handleNodeDrop(nodeId, containerId) {
        this.saveToHistory();
        DesignerStore.dropNode(nodeId, containerId);
        this.render();
        BlueprintManager.autoSave(DesignerStore.state.nodes, DesignerStore.state.connections);
    }

    saveMessage(message, parentId, newLabel = null) {
        if (!ModalController.editingNode) return;
        this.saveToHistory();
        ModalController.editingNode.message = message;
        ModalController.editingNode.parentId = parentId;
        if (newLabel) ModalController.editingNode.label = newLabel;

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

    /**
     * Schedule a render using RAF batching
     * Multiple calls within the same frame will only trigger one render
     */
    render() {
        // RAF Batching: If already pending, skip scheduling
        if (this.rafPending) return;

        this.rafPending = true;
        this.rafId = requestAnimationFrame(() => {
            this.rafPending = false;
            this._executeRender();
        });
    }

    /**
     * Internal render execution (called by RAF)
     */
    _executeRender() {
        if (!this.canvas || !this.canvas.getContext) return;

        // Clear entire canvas
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // navState logic removed - DesignerCanvas now gets it from cameraState

        let activeConn = null;
        let activeConnId = null;
        if (DesignerInteraction.activeConnection) {
            activeConn = DesignerInteraction.activeConnection;
            activeConnId = activeConn.fromNode ? activeConn.fromNode.id : null;
        }

        const interaction = DesignerInteraction.getInteractionState();
        const dropTargetId = interaction?.draggingId
            ? DesignerStore.findDropTarget(interaction.draggingId, cameraState.state.zoomScale)
            : null;

        // CRITICAL FIX: Read resizingNodeId from Store (Single Source of Truth)
        const resizingNodeId = DesignerStore.state.interaction.resizingNodeId;

        const draggingNodeId = DesignerStore.state.interaction.draggingNodeId;

        // LEVEL 1: Top-level render error boundary
        try {
            DesignerCanvas.render(
                this.canvas.width,
                this.canvas.height,
                DesignerStore.state.nodes,
                DesignerStore.state.connections,
                activeConnId,
                activeConn,
                DesignerInteraction.hoveredNodeId,
                dropTargetId,
                resizingNodeId,
                DesignerStore.state.interaction.selectedNodeId,
                interaction.selectedConnectionId,
                draggingNodeId
            );
        } catch (e) {
            console.error('[DesignerController] Critical render error:', e);
            console.error('[DesignerController] Stack:', e.stack);
            // Fallback: render error message
            this._renderErrorFallback(e);
        }

        // Sync inline editor if active (Passing explicit viewport state and coordinate transform)
        InlineEditor.syncPosition(cameraState.state, (pos) => DesignerInteraction.worldToScreen(pos));

        // Check for container animations
        this.checkAnimations();
    }

    /**
     * Fallback rendering when main render fails
     */
    _renderErrorFallback(error) {
        try {
            const ctx = this.canvas.getContext('2d');
            if (!ctx) return;

            // Dark background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Error message
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 16px monospace';
            ctx.fillText('Render Error - Check Console', 20, 30);
            ctx.fillStyle = '#ffaa88';
            ctx.font = '12px monospace';
            ctx.fillText(error.message.substring(0, 80), 20, 55);
        } catch (fallbackError) {
            console.error('[DesignerController] Even fallback rendering failed:', fallbackError);
        }
    }

    checkAnimations() {
        const hasAnimating = Object.values(DesignerStore.state.nodes).some(node => {
            if (!node.isRepoContainer || !node.dimensions || node.dimensions.isManual) return false;
            const d = node.dimensions;
            const isSizing = Math.abs(d.animW - d.targetW) > DESIGNER_CONSTANTS.ANIMATION.EPSILON_PX || Math.abs(d.animH - d.targetH) > DESIGNER_CONSTANTS.ANIMATION.EPSILON_PX;
            const isPulsing = d.transitionPadding > DESIGNER_CONSTANTS.ANIMATION.PULSE_EPSILON;
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
