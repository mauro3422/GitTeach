/**
 * ModalManager.js
 * Responsabilidad: Gestión de modales y prompts de UI
 */

import { drawerManager } from '../../DrawerManager.js';
import { DesignerMessageRenderer } from '../DesignerMessageRenderer.js';

export const ModalManager = {
    editingNode: null,

    /**
     * Open message modal for a node
     */
    openMessageModal(node, nodes, onSaveMessage, onClose) {
        // Step 1: Interaction Cleanup
        // (Assuming DesignerInteraction.cancelInteraction is called externally)

        this.editingNode = node;
        const container = document.getElementById('designer-container');
        const overlay = document.getElementById('modal-overlay');

        // Step 2: Delegate to Unified Drawer
        const drawer = drawerManager.show(container, 'message-drawer', 'pipeline-drawer');
        drawer.allNodes = nodes; // Pass reference for parenting selector

        DesignerMessageRenderer.render(
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
        // Create floating textarea for inline editing
        const container = document.getElementById('designer-container');
        // Assuming DesignerInteraction is available globally or passed
        const navState = window.DesignerInteraction?.state || { panOffset: { x: 0, y: 0 }, zoomScale: 1 };

        // Calculate screen position from world position
        const screenX = note.x * navState.zoomScale + navState.panOffset.x;
        const screenY = note.y * navState.zoomScale + navState.panOffset.y;

        const w = (note.dimensions?.w || 180) * navState.zoomScale;
        const h = (note.dimensions?.h || 100) * navState.zoomScale;

        // Create textarea
        const textarea = document.createElement('textarea');
        textarea.id = 'inline-note-editor';
        textarea.value = note.text;
        textarea.style.cssText = `
            position: absolute;
            left: ${screenX - w / 2}px;
            top: ${screenY - h / 2}px;
            width: ${w}px;
            height: ${h}px;
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
            if (onSave) onSave(note, textarea.value);
            textarea.remove();
        };

        textarea.addEventListener('blur', saveAndClose);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                textarea.remove();
            }
        });
    }
};
