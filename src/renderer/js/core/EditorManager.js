import { WidgetGallery } from '../components/widgetGallery.js';

/**
 * EditorManager - Handles Markdown Editor, Preview tabs and rendering
 */
export class EditorManager {
    static tabs = {};
    static slidingContainer = null;
    static editor = null;
    static preview = null;

    static init() {
        this.editor = document.getElementById('readme-editor');
        this.preview = document.getElementById('preview-container');
        this.slidingContainer = document.getElementById('editor-sliding-container');

        if (!this.editor || !this.preview) return;

        this.tabs = {
            editor: document.getElementById('btn-show-editor'),
            preview: document.getElementById('btn-show-preview'),
            gallery: document.getElementById('btn-show-gallery')
        };

        // Live Preview hook
        this.editor.addEventListener('input', () => this.render());

        // Button listeners
        this.tabs.editor?.addEventListener('click', () => this.switchTab('editor'));
        this.tabs.preview?.addEventListener('click', () => this.switchTab('preview'));
        if (this.tabs.gallery) {
            this.tabs.gallery.addEventListener('click', () => this.switchTab('gallery'));
        }

        this.render();
    }

    static render() {
        if (!this.editor || !this.preview) return;
        const text = this.editor.value;
        this.preview.innerHTML = window.marked ? window.marked.parse(text) : text;
    }

    static switchTab(activeTab) {
        // Reset classes
        Object.values(this.tabs).forEach(el => {
            if (el instanceof HTMLElement) el.classList.remove('active');
        });

        if (activeTab === 'editor') {
            this.tabs.editor.classList.add('active');
            if (this.slidingContainer) this.slidingContainer.style.transform = 'translateX(0%)';
        } else if (activeTab === 'preview') {
            this.tabs.preview.classList.add('active');
            if (this.slidingContainer) this.slidingContainer.style.transform = 'translateX(-33.333%)';
            this.render();
        } else if (activeTab === 'gallery') {
            this.tabs.gallery.classList.add('active');
            if (this.slidingContainer) this.slidingContainer.style.transform = 'translateX(-66.666%)';
            WidgetGallery.init();
        }
    }
}
