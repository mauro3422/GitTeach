import { DesignerCanvas } from './DesignerCanvas.js';
import { DesignerInteraction } from './DesignerInteraction.js';
import { BlueprintManager } from './BlueprintManager.js';
import { PIPELINE_NODES } from '../PipelineConstants.js';
import { drawerManager } from '../DrawerManager.js';
import { DesignerMessageRenderer } from './DesignerMessageRenderer.js';

export const RoutingDesigner = {
    canvas: null,
    ctx: null,
    nodes: {},
    manualConnections: [],
    editingNode: null,

    // Undo/Redo History
    historyStack: [],
    redoStack: [],
    maxHistorySize: 50,

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Load Initial State (from constants)
        this.loadInitialNodes();

        // Init Sub-Modules
        DesignerCanvas.init(this.ctx);
        DesignerInteraction.init(
            this.canvas,
            this.nodes,
            () => this.render(),
            (fromId, toId) => this.addManualConnection(fromId, toId),
            (node) => this.openMessageModal(node),
            (nodeId, containerId) => this.handleNodeDrop(nodeId, containerId),
            (note) => this.openInlineEditor(note) // Sticky note double-click
        );
        BlueprintManager.init(this.nodes);

        // Resize and initial render
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // UI Events
        const saveBtn = document.getElementById('save-blueprint');
        const resetBtn = document.getElementById('reset-layout');
        const addNodeBtn = document.getElementById('add-node');
        const addContBtn = document.getElementById('add-container');

        if (saveBtn) saveBtn.onclick = () => BlueprintManager.save(this.nodes, this.manualConnections);

        if (resetBtn) {
            resetBtn.onclick = () => {
                this.loadInitialNodes();
                this.manualConnections = [];
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

        this.editingNode = node;
        const container = document.getElementById('designer-container');
        const overlay = document.getElementById('modal-overlay');

        // Step 2: Delegate to Unified Drawer
        const drawer = drawerManager.show(container, 'message-drawer', 'pipeline-drawer');
        drawer.allNodes = this.nodes; // Pass reference for parenting selector

        DesignerMessageRenderer.render(
            drawer,
            node,
            (msg, pId, label) => this.saveMessage(msg, pId, label),
            () => this.closeModal()
        );

        overlay.style.display = 'block';
    },

    closeModal() {
        drawerManager.close();
        document.getElementById('modal-overlay').style.display = 'none';
        this.editingNode = null;
    },

    // Save current state to history (before making changes)
    saveToHistory() {
        const snapshot = {
            nodes: JSON.parse(JSON.stringify(this.nodes)),
            connections: JSON.parse(JSON.stringify(this.manualConnections))
        };
        this.historyStack.push(snapshot);
        if (this.historyStack.length > this.maxHistorySize) {
            this.historyStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
    },

    undo() {
        if (this.historyStack.length === 0) return;
        // Save current state to redo stack
        const currentState = {
            nodes: JSON.parse(JSON.stringify(this.nodes)),
            connections: JSON.parse(JSON.stringify(this.manualConnections))
        };
        this.redoStack.push(currentState);

        // Restore previous state
        const prevState = this.historyStack.pop();
        this.nodes = prevState.nodes;
        this.manualConnections = prevState.connections;
        DesignerInteraction.nodes = this.nodes;
        this.render();
        console.log('[RoutingDesigner] Undo');
    },

    redo() {
        if (this.redoStack.length === 0) return;
        // Save current state to history
        const currentState = {
            nodes: JSON.parse(JSON.stringify(this.nodes)),
            connections: JSON.parse(JSON.stringify(this.manualConnections))
        };
        this.historyStack.push(currentState);

        // Restore redo state
        const redoState = this.redoStack.pop();
        this.nodes = redoState.nodes;
        this.manualConnections = redoState.connections;
        DesignerInteraction.nodes = this.nodes;
        this.render();
        console.log('[RoutingDesigner] Redo');
    },

    addCustomNode(isContainer) {
        // Simplified: Generate default name immediately, no modal needed
        const typeLabel = isContainer ? 'Box' : 'Node';
        const count = Object.keys(this.nodes).filter(k => k.startsWith('custom_')).length + 1;
        const name = `${typeLabel} ${count}`;

        this.saveToHistory();

        const id = `custom_${Date.now()}`;
        const canvas = document.getElementById('designer-canvas');
        const centerX = (canvas.width / 2 - DesignerInteraction.state.panOffset.x) / DesignerInteraction.state.zoomScale;
        const centerY = (canvas.height / 2 - DesignerInteraction.state.panOffset.y) / DesignerInteraction.state.zoomScale;

        const newNode = {
            id,
            x: centerX,
            y: centerY,
            label: name,
            icon: isContainer ? '📦' : '🧩',
            color: isContainer ? '#8957e5' : '#238636',
            isRepoContainer: isContainer,
            description: `Elemento personalizado: ${name}`,
            internalClasses: isContainer ? [] : []
        };

        this.nodes[id] = newNode;
        DesignerInteraction.nodes = this.nodes;
        this.render();
        console.log(`[RoutingDesigner] Added ${typeLabel}: ${name}`);
    },

    addStickyNote() {
        this.saveToHistory();

        const id = `sticky_${Date.now()}`;
        const canvas = document.getElementById('designer-canvas');
        const centerX = (canvas.width / 2 - DesignerInteraction.state.panOffset.x) / DesignerInteraction.state.zoomScale;
        const centerY = (canvas.height / 2 - DesignerInteraction.state.panOffset.y) / DesignerInteraction.state.zoomScale;

        const newNote = {
            id,
            x: centerX,
            y: centerY,
            text: 'Nueva nota...',
            isStickyNote: true,
            width: 180,
            height: 100,
            color: '#3fb950' // Neon green
        };

        this.nodes[id] = newNote;
        DesignerInteraction.nodes = this.nodes;
        this.render();
        console.log(`[RoutingDesigner] Added sticky note: ${id}`);

        // Immediately open inline editor
        setTimeout(() => this.openInlineEditor(newNote), 100);
    },

    openInlineEditor(note) {
        // Create floating textarea for inline editing
        const container = document.getElementById('designer-container');
        const navState = DesignerInteraction.state;

        // Calculate screen position from world position
        const screenX = note.x * navState.zoomScale + navState.panOffset.x;
        const screenY = note.y * navState.zoomScale + navState.panOffset.y;

        // Create textarea
        const textarea = document.createElement('textarea');
        textarea.id = 'inline-note-editor';
        textarea.value = note.text;
        textarea.style.cssText = `
            position: absolute;
            left: ${screenX - (note.width * navState.zoomScale) / 2}px;
            top: ${screenY - (note.height * navState.zoomScale) / 2}px;
            width: ${note.width * navState.zoomScale}px;
            height: ${note.height * navState.zoomScale}px;
            background: rgba(22, 27, 34, 0.95);
            border: 2px solid #3fb950;
            border-radius: 8px;
            color: #3fb950;
            font-family: var(--font-mono), monospace;
            font-size: ${Math.max(16, 20 * navState.zoomScale)}px;
            padding: 10px;
            resize: none;
            z-index: 500;
            outline: none;
            box-shadow: 0 0 20px rgba(63, 185, 80, 0.3);
        `;
        container.appendChild(textarea);
        textarea.focus();
        textarea.select();

        // Save on blur or Enter
        const saveAndClose = () => {
            this.saveToHistory();
            note.text = textarea.value || 'Nota vacía';
            textarea.remove();
            this.render();
        };

        textarea.addEventListener('blur', saveAndClose);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                textarea.remove();
                this.render();
            }
        });
    },

    handleNodeDrop(nodeId, containerId) {
        const node = this.nodes[nodeId];
        const container = this.nodes[containerId];
        if (!node || !container) return;

        this.saveToHistory();
        node.parentId = containerId;

        // Get all sibling nodes (other children of the same container)
        const siblings = Object.values(this.nodes).filter(
            n => n.parentId === containerId && n.id !== nodeId
        );

        // Collision detection and avoidance
        const nodeRadius = node.isSatellite ? 25 : 35;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            let hasCollision = false;
            for (const sibling of siblings) {
                const sibRadius = sibling.isSatellite ? 25 : 35;
                const minDist = nodeRadius + sibRadius + 15; // 15px gap
                const dx = node.x - sibling.x;
                const dy = node.y - sibling.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    hasCollision = true;
                    // Push node away from sibling
                    const angle = Math.atan2(dy, dx) || (Math.random() * Math.PI * 2);
                    const pushDist = minDist - dist + 5;
                    node.x += Math.cos(angle) * pushDist;
                    node.y += Math.sin(angle) * pushDist;
                    break;
                }
            }
            if (!hasCollision) break;
            attempts++;
        }

        console.log(`[RoutingDesigner] Auto-parented ${nodeId} to ${containerId} (${attempts} collision fixes)`);
        this.render();
    },

    openPrompt(title, defaultValue, onConfirm) {
        const modal = document.getElementById('custom-prompt-container');
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('prompt-title');
        const input = document.getElementById('custom-prompt-input');
        const cancelBtn = document.getElementById('prompt-cancel');
        const confirmBtn = document.getElementById('prompt-confirm');

        titleEl.innerText = title;
        input.value = defaultValue;
        modal.style.display = 'block';
        overlay.style.display = 'block';

        input.focus();
        input.select();

        const close = () => {
            modal.style.display = 'none';
            overlay.style.display = 'none';
        };

        cancelBtn.onclick = () => close();
        confirmBtn.onclick = () => {
            onConfirm(input.value);
            close();
        };

        // Handle Enter key
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                onConfirm(input.value);
                close();
            }
            if (e.key === 'Escape') close();
        };
    },

    saveMessage(message, parentId, newLabel = null) {
        if (!this.editingNode) return;

        this.saveToHistory();

        this.editingNode.message = message;
        this.editingNode.parentId = parentId;
        if (newLabel) {
            this.editingNode.label = newLabel;
        }

        this.closeModal();
        this.render();
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    },

    loadInitialNodes() {
        const scale = 1200;
        // Do NOT reassign this.nodes, clear it in-place to keep references alive
        Object.keys(this.nodes).forEach(key => delete this.nodes[key]);

        Object.entries(PIPELINE_NODES).forEach(([id, config]) => {
            if (config.isDynamic && config.hidden) return;

            let x = config.x * scale;
            let y = config.y * scale;

            if (config.isSatellite && config.orbitParent) {
                const parent = PIPELINE_NODES[config.orbitParent];
                if (parent) {
                    const radius = (config.orbitRadius || 0.18) * 800;
                    const angle = (config.orbitAngle || 0) * (Math.PI / 180);
                    x = (parent.x * scale) + radius * Math.cos(angle);
                    y = (parent.y * scale) + radius * Math.sin(angle);
                }
            }

            this.nodes[id] = {
                id, x, y,
                label: config.label,
                sublabel: config.sublabel,
                icon: config.icon,
                color: config.color,
                description: config.description,
                internalClasses: config.internalClasses,
                isRepoContainer: config.isRepoContainer,
                isSatellite: config.isSatellite,
                orbitParent: config.orbitParent
            };
        });

        // SECOND PASS: Create child nodes for internal components (folders/classes)
        // Restricted ONLY to Cache Store as per user request
        Object.keys(this.nodes).forEach(parentId => {
            if (parentId !== 'cache') return;

            const parent = this.nodes[parentId];
            if (parent.internalClasses && parent.internalClasses.length > 0) {
                const cols = 2; // Split in 2 columns for better box fit
                const gapX = 220; // Increased to avoid label overlap
                const gapY = 120; // Increased for vertical breathing room

                parent.internalClasses.forEach((className, idx) => {
                    const childId = `child_${parentId}_${idx}`;
                    const row = Math.floor(idx / cols);
                    const col = idx % cols;

                    this.nodes[childId] = {
                        id: childId,
                        parentId: parentId,
                        // Initial position relative to parent (centered-ish)
                        x: parent.x + (col - (cols - 1) / 2) * gapX,
                        y: parent.y + (row * gapY) + 50, // More top padding for title
                        label: className,
                        icon: '📁',
                        color: parent.color,
                        isSatellite: true // Use satellite sizing for cleaner look inside boxes
                    };
                });
            }
        });
    },

    addManualConnection(fromId, toId) {
        // Prevent duplicates
        if (this.manualConnections.some(c => c.from === fromId && c.to === toId)) return;
        this.saveToHistory();
        this.manualConnections.push({ from: fromId, to: toId });
        this.render();
    },

    render() {
        if (!this.ctx) return;
        const navState = DesignerInteraction.state;

        DesignerCanvas.drawGrid(this.canvas.width, this.canvas.height, navState);

        // DRAW NODES FIRST (containers in background, regular nodes in foreground)
        DesignerCanvas.drawNodes(this.nodes, navState, DesignerInteraction.activeConnection?.fromNode?.id);

        // DRAW UI LABELS (Directly on screen coordinates)
        DesignerCanvas.drawUI(this.nodes, navState);

        // DRAW MANUAL CONNECTIONS ON TOP (so they're visible over containers)
        this.manualConnections.forEach(conn => {
            const startNode = this.nodes[conn.from];
            const endNode = this.nodes[conn.to];
            if (startNode && endNode) {
                DesignerCanvas.drawSimpleLine(startNode, endNode, navState, this.nodes);
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
    }
};
