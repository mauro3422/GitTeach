import { DesignerEvents } from '../core/DesignerEvents.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { GeometryUtils } from '../GeometryUtils.js';

export const InlineEditor = {
    activeRef: null, // { textarea, note, onSave } - for compatibility with ContainerRenderer

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
        this.activeRef = { textarea, note, onSave }; // Store ref for syncing

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

        // REAL-TIME SYNC: Update canvas as you type
        textarea.addEventListener('input', () => {
            note.text = textarea.value;
            DesignerEvents.requestRender();
        });

        // Save on blur or Escape
        const saveAndClose = () => {
            if (this.activeRef) {
                if (onSave) onSave(note, textarea.value);
                textarea.remove();
                this.activeRef = null;
                DesignerEvents.requestRender();
            }
        };

        textarea.addEventListener('blur', saveAndClose);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                textarea.remove();
                this.activeRef = null;
                DesignerEvents.requestRender();
            }
            if (e.key === 'Enter' && e.ctrlKey) {
                saveAndClose();
            }
        });
    },

    /**
     * Sync inline editor position with camera changes
     * @param {Object} viewportState - { zoomScale, panOffset }
     * @param {Function} worldToScreen - (pos) => screenPos
     */
    syncPosition(viewportState, worldToScreen) {
        if (!this.activeRef || !viewportState || !worldToScreen) return;
        const { textarea, note } = this.activeRef;
        const container = document.getElementById('designer-container');
        if (!container) return;

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

        // Use the INJECTED COORDINATE TRANSFORMATION
        const screenPos = worldToScreen({ x: note.x, y: note.y });

        // CRITICAL SYNC: Ensure HTML coordinates don't drift from Canvas pixels
        textarea.style.left = `${screenPos.x - w / 2}px`;
        textarea.style.top = `${screenPos.y - h / 2}px`;
        textarea.style.width = `${w}px`;
        textarea.style.height = `${h}px`;

        // FIXED: Sync font size with inflation logic
        const baseFontSize = 18;
        const fScale = GeometryUtils.getFontScale(zoom, baseFontSize);
        const physicalFontSize = baseFontSize * fScale * zoom;

        textarea.style.fontSize = `${physicalFontSize}px`;
        textarea.style.lineHeight = `${(baseFontSize + 6) * fScale * zoom}px`;
        textarea.style.padding = `${15 * fScale * zoom}px`;

    },

    /**
     * Close and cleanup inline editor
     */
    close() {
        if (this.activeRef) {
            const { textarea } = this.activeRef;
            if (textarea && textarea.parentNode) {
                textarea.parentNode.removeChild(textarea);
            }
            this.activeRef = null;
        }
    }
};
