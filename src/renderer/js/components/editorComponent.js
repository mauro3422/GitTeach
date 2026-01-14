// src/renderer/js/components/editorComponent.js
import { WidgetGallery } from './widgetGallery.js';

export const EditorComponent = {
    tabs: {
        editor: null,
        preview: null,
        gallery: null,
        slidingContainer: null
    },

    init() {
        this.tabs.editor = document.getElementById('btn-show-editor');
        this.tabs.preview = document.getElementById('btn-show-preview');
        this.tabs.slidingContainer = document.getElementById('editor-sliding-container');

        const editorArea = document.getElementById('readme-editor');
        const previewContainer = document.getElementById('preview-container');

        if (!editorArea || !previewContainer) {
            console.error('[EditorComponent] Missing DOM elements.');
            return;
        }

        // 1. Live Preview logic
        const render = () => {
            const text = editorArea.value;
            previewContainer.innerHTML = window.marked ? window.marked.parse(text) : text;
        };

        editorArea.addEventListener('input', render);
        render(); // Initial render

        // 2. Tab Listeners
        this.tabs.editor?.addEventListener('click', () => this.switchTab('editor', render));
        this.tabs.preview?.addEventListener('click', () => this.switchTab('preview', render));

        console.log('[EditorComponent] Initialized correctly.');
    },

    switchTab(tabId, renderCallback = null) {
        // Reset classes
        [this.tabs.editor, this.tabs.preview].forEach(btn => {
            btn?.classList.remove('active');
        });

        // Sliding logic (0, -50%)
        if (tabId === 'editor') {
            this.tabs.editor?.classList.add('active');
            if (this.tabs.slidingContainer) this.tabs.slidingContainer.style.transform = 'translateX(0%)';
        } else if (tabId === 'preview') {
            this.tabs.preview?.classList.add('active');
            if (this.tabs.slidingContainer) this.tabs.slidingContainer.style.transform = 'translateX(-50%)';
            if (renderCallback) renderCallback();
        }
    }
};
