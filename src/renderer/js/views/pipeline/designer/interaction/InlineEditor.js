/**
 * InlineEditor.js
 * SRP: Specialized class handling the floating DOM textarea for sticky notes
 * Manages "sync on camera move", ghost styling, and DOM event listeners
 */

import { DesignerEvents } from '../core/DesignerEvents.js';

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
            background: rgba(13, 17, 23, 0.1); /* Subtle dark glass */
            border: none;
            color: #ffffff;
            font-family: "Fira Code", monospace;
            padding: 15px;
            box-sizing: border-box; /* CRITICAL: Include padding in width/height */
            resize: none;
            outline: none;
            overflow: hidden;
            text-align: left;
            word-break: break-word; /* Handle long words */
            caret-color: #3fb950;
            pointer-events: all;
            z-index: 2000; /* ABOVE EVERYTHING */
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
     */
    syncPosition() {
        if (!this.activeRef) return;
        const { textarea, note } = this.activeRef;
        const interaction = window.DesignerInteraction; // Access from global for now
        const container = document.getElementById('designer-container');
        if (!interaction || !container) return;

        // Use the CENTRAL COORDINATE TRANSFORMATION from Interaction
        const screenPos = interaction.worldToScreen({ x: note.x, y: note.y });

        const zoom = interaction.state.zoomScale;
        // FIX: Use RENDER dimensions if available (dynamic inflation), fallback to saved dimensions
        const rawW = note.dimensions?.renderW || note.dimensions?.w || 180;
        const rawH = note.dimensions?.renderH || note.dimensions?.h || 100;

        const w = rawW * zoom;
        const h = rawH * zoom;

        // CRITICAL SYNC: Ensure HTML coordinates don't drift from Canvas pixels
        textarea.style.left = `${screenPos.x - w / 2}px`;
        textarea.style.top = `${screenPos.y - h / 2}px`;
        textarea.style.width = `${w}px`;
        textarea.style.height = `${h}px`;
        // FIXED 12px font in screen-space - compact and readable
        textarea.style.fontSize = `12px`;
        textarea.style.lineHeight = `1.3`; // ~15.6px
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
