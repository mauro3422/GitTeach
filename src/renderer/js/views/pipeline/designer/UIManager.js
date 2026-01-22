/**
 * Gestor de Interfaz de Usuario
 * Centraliza toda la lógica de UI, botones y overlays
 */

import { BlueprintManager } from './BlueprintManager.js';
import { DesignerInteraction } from './DesignerInteraction.js';
import { DesignerStore } from './modules/DesignerStore.js';

export const UIManager = {
    designerContext: null,

    /**
     * Inicializa el gestor de UI con el contexto del designer
     * @param {Object} designerContext - Contexto del RoutingDesigner
     */
    init(designerContext) {
        this.designerContext = designerContext;
        this.bindUIEvents();
        this.bindToolboxEvents();
        this.bindGlobalEvents();
        this.setupKeyboardShortcuts();
    },

    /**
     * Vincula eventos de botones principales
     */
    bindUIEvents() {
        const saveBtn = document.getElementById('save-blueprint');
        const resetBtn = document.getElementById('reset-layout');
        const addNodeBtn = document.getElementById('add-node');
        const addContBtn = document.getElementById('add-container');
        const addStickyBtn = document.getElementById('add-sticky');

        if (saveBtn) {
            saveBtn.onclick = () => {
                BlueprintManager.save(DesignerStore.state.connections, DesignerStore.state.nodes);
            };
        }

        if (resetBtn) {
            resetBtn.onclick = () => {
                DesignerStore.loadInitialNodes();
                DesignerInteraction.state.panOffset = { x: 0, y: 0 };
                DesignerInteraction.state.zoomScale = 1.0;
                this.designerContext.render();
            };
        }

        if (addNodeBtn) addNodeBtn.onclick = () => this.designerContext.addCustomNode(false);
        if (addContBtn) addContBtn.onclick = () => this.designerContext.addCustomNode(true);
        if (addStickyBtn) addStickyBtn.onclick = () => this.designerContext.addStickyNote();
    },

    /**
     * Vincula eventos del toolbox (drawer)
     */
    bindToolboxEvents() {
        const toolboxToggle = document.getElementById('toolbox-toggle');
        const toolboxDrawer = document.getElementById('toolbox-drawer');
        const toolboxClose = document.getElementById('toolbox-close');

        if (toolboxToggle && toolboxDrawer) {
            toolboxToggle.onclick = () => {
                const overlay = document.getElementById('modal-overlay');
                toolboxDrawer.classList.add('open');
                toolboxToggle.style.display = 'none';
                if (overlay) overlay.style.display = 'block';
            };
        }

        if (toolboxClose && toolboxDrawer && toolboxToggle) {
            toolboxClose.onclick = () => {
                const overlay = document.getElementById('modal-overlay');
                toolboxDrawer.classList.remove('open');
                toolboxToggle.style.display = 'flex';
                if (overlay) overlay.style.display = 'none';
            };
        }
    },

    /**
     * Vincula eventos globales
     */
    bindGlobalEvents() {
        // Global interactions might need overlay
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.onclick = () => this.designerContext.closeModal();
        }
    },

    /**
     * Configura shortcuts de teclado - DEPRECATED
     * Los shortcuts ahora se manejan centralizadamente en InputManager
     * @deprecated Use InputManager.registerShortcut instead
     */
    setupKeyboardShortcuts() {
        console.warn('[UIManager] setupKeyboardShortcuts is deprecated. Shortcuts are now handled by InputManager.');
        // No longer registers any listeners here - delegated to InputManager
    }
};
