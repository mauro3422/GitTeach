/**
 * ModalManager.js
 * Responsabilidad: Gestión de modales y prompts de UI
 */

import { drawerManager } from '../../DrawerManager.js';
import { UIDrawerRenderer } from '../UIDrawerRenderer.js';
import { DesignerInteraction } from '../DesignerInteraction.js';
import { globalEventBus } from '../../../../core/EventBus.js';

export const ModalManager = {
    editingNode: null,

    /**
     * Open message modal for a node
     */
    openMessageModal(node, nodes, onSaveMessage, onClose) {
        if (node.isStickyNote) {
            console.warn('[ModalManager] ⚠️ Attempted to open MessageModal for a StickyNote. Redirecting to InlineEditor.');
            this.openInlineEditor(node);
            return;
        }

        // Step 1: Interaction Cleanup
        // (Assuming DesignerInteraction.cancelInteraction is called externally)

        this.editingNode = node;
        const container = document.getElementById('designer-container');
        const overlay = document.getElementById('modal-overlay');

        // Step 2: Delegate to Unified Drawer
        const drawer = drawerManager.show(container, 'message-drawer', 'pipeline-drawer');
        drawer.allNodes = nodes; // Pass reference for parenting selector

        UIDrawerRenderer.render(
            drawer,
            node,
            (msg, pId, label) => {
                if (onSaveMessage) onSaveMessage(msg, pId, label);
                this.closeModal();
            },
            () => this.closeModal()
        );

        overlay.style.display = 'block';
    },

    /**
     * Close all modals
     */
    closeModal() {
        drawerManager.close();

        // Close Toolbox if open
        const toolbox = document.getElementById('toolbox-drawer');
        const toolboxToggle = document.getElementById('toolbox-toggle');
        if (toolbox) toolbox.classList.remove('open');
        if (toolboxToggle) toolboxToggle.style.display = 'flex';

        document.getElementById('modal-overlay').style.display = 'none';
        this.editingNode = null;
    },

    /**
     * Open prompt modal for user input
     */
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

    /**
     * Open inline editor for sticky notes
     */
    openInlineEditor(note, onSave) {
        // FORCE CLOSE any drawers/modals that might be trying to open
        this.closeModal();

        // Create floating textarea for inline editing
        const container = document.getElementById('designer-container');
        const textarea = document.createElement('textarea');
        textarea.id = 'inline-note-editor';
        this.activeInlineRef = { textarea, note, onSave }; // Store ref for syncing

        textarea.value = note.text;

        // GHOST STYLING: Truly invisible overlay. 
        textarea.style.cssText = `
            position: absolute;
            background: rgba(13, 17, 23, 0.1); /* Subtle dark glass */
            border: none;
            color: #ffffff;
            font-family: "Fira Code", monospace;
            padding: 15px;
            resize: none;
            z-index: 2000; /* ABOVE EVERYTHING */
            outline: none;
            overflow: hidden;
            text-align: left;
            caret-color: #3fb950;
            pointer-events: all;
        `;

        // Add style tag for subtle selection color
        if (!document.getElementById('ghost-editor-style')) {
            const style = document.createElement('style');
            style.id = 'ghost-editor-style';
            style.textContent = `
                #inline-note-editor::selection {
                    background: rgba(63, 185, 80, 0.3);
                    color: white;
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(textarea);
        this.syncNoteEditorPosition(); // Initial position

        textarea.focus();
        // Start editing at the end of the text
        textarea.selectionStart = textarea.value.length;
        textarea.selectionEnd = textarea.value.length;

        // REAL-TIME SYNC: Update canvas as you type
        textarea.addEventListener('input', () => {
            note.text = textarea.value;
            globalEventBus.emit('designer:render:request');
        });

        // Save on blur or Escape
        const saveAndClose = () => {
            if (this.activeInlineRef) {
                if (onSave) onSave(note, textarea.value);
                textarea.remove();
                this.activeInlineRef = null;
                globalEventBus.emit('designer:render:request');
            }
        };

        textarea.addEventListener('blur', saveAndClose);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                textarea.remove();
                this.activeInlineRef = null;
                globalEventBus.emit('designer:render:request');
            }
            if (e.key === 'Enter' && e.ctrlKey) {
                saveAndClose();
            }
        });
    },

    /**
     * Sync inline editor position with camera changes
     */
    syncNoteEditorPosition() {
        if (!this.activeInlineRef) return;
        const { textarea, note } = this.activeInlineRef;
        const interaction = DesignerInteraction;
        const container = document.getElementById('designer-container');
        if (!interaction || !container) return;

        // Use the CENTRAL COORDINATE TRANSFORMATION from Interaction
        const screenPos = interaction.worldToScreen({ x: note.x, y: note.y });

        const zoom = interaction.state.zoomScale;
        const baseW = note.dimensions?.w || 180;
        const baseH = note.dimensions?.h || 100;

        const w = (note.dimensions?.animW || baseW) * zoom;
        const h = (note.dimensions?.animH || baseH) * zoom;

        // CRITICAL SYNC: Ensure HTML coordinates don't drift from Canvas pixels
        // by making them relative to the same parent coordinate system.
        textarea.style.left = `${screenPos.x - w / 2}px`;
        textarea.style.top = `${screenPos.y - h / 2}px`;
        textarea.style.width = `${w}px`;
        textarea.style.height = `${h}px`;
        textarea.style.fontSize = `${16 * zoom}px`;
        textarea.style.lineHeight = `1.2`;
    }
};
