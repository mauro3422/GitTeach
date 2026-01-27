/**
 * ModalController.js
 * SRP: Pure coordinator for standard modals and UIDrawerRenderer
 * Handles message modals, prompts, and modal lifecycle
 */

import { drawerManager } from '../../DrawerManager.js';
import { UIDrawerRenderer } from '../UIDrawerRenderer.js';
import { DesignerEvents } from '../core/DesignerEvents.js';
import { DesignerStore } from './DesignerStore.js';

export const ModalController = {
    editingNode: null,
    _subscription: null,

    /**
     * SRP: Initialize global listeners
     */
    init() {
        if (this._subscription) return;
        this._subscription = DesignerStore.subscribe(() => this.handleStoreUpdate());
    },

    /**
     * React to store changes (Reactivity fix)
     */
    handleStoreUpdate() {
        if (!this.editingNode) return;

        const drawer = document.getElementById('pipeline-drawer');
        if (!drawer || !drawer.classList.contains('open')) return;

        // Ensure we use the latest nodes state for deduplication logic
        const latestNodes = DesignerStore.state.nodes;
        drawer.allNodes = latestNodes;

        // CRITICAL: Update the editingNode reference itself from the latest state
        // This ensures the drawer UI reflects recent canvas changes (like parenting)
        if (latestNodes[this.editingNode.id]) {
            this.editingNode = latestNodes[this.editingNode.id];
        }

        // Refresh only the functional components list to avoid losing textarea focus/content
        UIDrawerRenderer.refreshInternalComponents(drawer, this.editingNode);
    },

    /**
     * Open message modal for a node
     */
    openMessageModal(node, nodes, onSaveMessage, onClose) {
        if (node.isStickyNote) {
            console.warn('[ModalController] ⚠️ Attempted to open MessageModal for a StickyNote. Redirecting to InlineEditor.');
            // Note: This will be handled by InlineEditor in the new architecture
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
    }
};
