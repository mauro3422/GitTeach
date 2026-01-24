import { DesignerEvents } from '../core/DesignerEvents.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { CoordinateUtils } from '../CoordinateUtils.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { TextScalingManager } from '../utils/TextScalingManager.js';
import { DesignerStore } from '../modules/DesignerStore.js';

export const InlineEditor = {
    activeRef: null, // { textarea, note, onSave, handlers } - includes event handlers for cleanup

    /**
     * Open inline editor for sticky notes
     */
    open(note, onSave) {
        // FORCE CLOSE any drawers/modals that might be trying to open
        this.close();

        // Create floating textarea for inline editing
        const container = document.getElementById('designer-container');
        const textarea = document.createElement('textarea');
        textarea.id = 'inline-note-editor';

        // Store ref for syncing - handlers will be added after definition
        this.activeRef = { textarea, note, onSave, handlers: {} };

        textarea.value = note.text;

        // GHOST STYLING: Truly invisible overlay. Positioning and sizing handled by syncPosition
        textarea.style.cssText = `
            position: absolute;
            background: ${ThemeManager.colors.editorBg}; /* Glass-like transparency from theme */
            border: none;
            color: ${ThemeManager.colors.textBright};
            font-family: ${ThemeManager.colors.fontMono};
            padding: ${ThemeManager.geometry.sticky.padding}px;
            box-sizing: border-box; /* CRITICAL: Include padding in width/height */
            resize: none;
            outline: none;
            overflow: hidden;
            text-align: left;
            word-break: break-word; /* Handle long words */
            caret-color: ${ThemeManager.colors.caret};
            pointer-events: all;
            z-index: ${ThemeManager.layers.editor}; /* ABOVE EVERYTHING */
        `;

        // Add style tag for subtle selection color using theme tokens
        if (!document.getElementById('ghost-editor-style')) {
            const style = document.createElement('style');
            style.id = 'ghost-editor-style';
            style.textContent = `
                #inline-note-editor::selection {
                    background: ${ThemeManager.colors.selection};
                    color: white;
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(textarea);
        this.syncPosition(); // Initial position

        textarea.focus();
        // Start editing at the end of the text
        textarea.selectionStart = textarea.value.length;
        textarea.selectionEnd = textarea.value.length;

        // Define handlers with references for proper cleanup
        const handlers = {
            input: () => {
                // SAFETY: Validate node still exists before updating
                const stillExists = DesignerStore.getNode(note.id);
                if (stillExists) {
                    note.text = textarea.value;
                    DesignerEvents.requestRender();
                } else {
                    console.warn('[InlineEditor] Node was deleted, stopping edit sync:', note.id);
                    this.close();
                }
            },
            blur: () => {
                this.saveAndClose();
            },
            keydown: (e) => {
                if (e.key === 'Escape') {
                    this.close(); // Close without saving
                    DesignerEvents.requestRender();
                }
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.saveAndClose();
                }
            }
        };

        // Store handlers for cleanup
        this.activeRef.handlers = handlers;

        // REAL-TIME SYNC: Update canvas as you type
        textarea.addEventListener('input', handlers.input);
        textarea.addEventListener('blur', handlers.blur);
        textarea.addEventListener('keydown', handlers.keydown);
    },

    /**
     * Save content and close editor
     */
    saveAndClose() {
        if (this.activeRef) {
            const { note, textarea, onSave } = this.activeRef;

            // SAFETY: Validate node still exists before saving
            const stillExists = DesignerStore.getNode(note.id);
            if (!stillExists) {
                console.warn('[InlineEditor] Node was deleted, discarding changes:', note.id);
                this.close();
                DesignerEvents.requestRender();
                return;
            }

            if (onSave) onSave(note, textarea.value);
            this.close();
            DesignerEvents.requestRender();
        }
    },

    /**
     * Sync inline editor position with camera changes
     * @param {Object} viewportState - { zoomScale, panOffset }
     * @param {Function} [worldToScreen] - Optional: (pos) => screenPos. Uses CoordinateUtils if not provided.
     */
    syncPosition(viewportState, worldToScreen = null) {
        if (!this.activeRef || !viewportState) return;
        const { textarea, note } = this.activeRef;
        const container = document.getElementById('designer-container');
        if (!container) return;

        // SAFETY: Validate node still exists before syncing position
        const stillExists = DesignerStore.getNode(note.id);
        if (!stillExists) {
            console.warn('[InlineEditor] Node was deleted during editing, closing editor:', note.id);
            this.close();
            return;
        }

        const zoom = viewportState.zoomScale;

        // SYSTEMIC SYNC: The HTML editor must match the INFLATED box on the canvas
        // This was the "Halfway" bug: editor was using logical dimensions while canvas was using vScale/fScale
        const bounds = note.isStickyNote
            ? GeometryUtils.getStickyNoteBounds(note, null, zoom)
            : GeometryUtils.getContainerBounds(note, {}, zoom); // Fallback for boxes

        const renderW = bounds.renderW;
        const renderH = bounds.renderH;

        const w = renderW * zoom;
        const h = renderH * zoom;

        // Use centralized coordinate transformation (or injected for backward compatibility)
        const screenPos = worldToScreen
            ? worldToScreen({ x: note.x, y: note.y })
            : CoordinateUtils.worldToScreen({ x: note.x, y: note.y }, viewportState);

        // CRITICAL SYNC: Ensure HTML coordinates don't drift from Canvas pixels
        textarea.style.left = `${screenPos.x - w / 2}px`;
        textarea.style.top = `${screenPos.y - h / 2}px`;
        textarea.style.width = `${w}px`;
        textarea.style.height = `${h}px`;

        // ROBUST PATTERN: Use TextScalingManager (Single Source of Truth)
        const { TYPOGRAPHY, DIMENSIONS } = DESIGNER_CONSTANTS;
        const baseFontSize = TYPOGRAPHY.STICKY_FONT_SIZE;
        const fScale = TextScalingManager.getFontScale(zoom, baseFontSize);
        const physicalFontSize = baseFontSize * fScale * zoom;

        textarea.style.fontSize = `${physicalFontSize}px`;
        textarea.style.lineHeight = `${(baseFontSize + TYPOGRAPHY.LINE_HEIGHT_OFFSET) * fScale * zoom}px`;
        textarea.style.padding = `${DIMENSIONS.STICKY_NOTE.PADDING * fScale * zoom}px`;

    },

    /**
     * Close and cleanup inline editor
     * Properly removes event listeners to prevent memory leaks
     */
    close() {
        if (this.activeRef) {
            const { textarea, handlers } = this.activeRef;

            // CRITICAL: Remove event listeners before removing element
            if (textarea && handlers) {
                textarea.removeEventListener('input', handlers.input);
                textarea.removeEventListener('blur', handlers.blur);
                textarea.removeEventListener('keydown', handlers.keydown);
            }

            if (textarea && textarea.parentNode) {
                textarea.parentNode.removeChild(textarea);
            }
            this.activeRef = null;
        }
    }
};
