export class TabManager {
    constructor() {
        this.tabs = {
            editor: null,
            preview: null,
            slidingContainer: null
        };
        this.previewManager = null;
    }

    init(editorTab, previewTab, slidingContainer, previewManager) {
        this.tabs.editor = editorTab;
        this.tabs.preview = previewTab;
        this.tabs.slidingContainer = slidingContainer;
        this.previewManager = previewManager;

        this.attachTabListeners();
    }

    attachTabListeners() {
        if (this.tabs.editor) {
            this.tabs.editor.addEventListener('click', () => this.switchTab('editor'));
        }
        if (this.tabs.preview) {
            this.tabs.preview.addEventListener('click', () => this.switchTab('preview'));
        }
    }

    switchTab(tabId) {
        // Reset classes
        this.resetActiveStates();

        // Apply sliding logic and active states
        if (tabId === 'editor') {
            this.setActiveTab(this.tabs.editor);
            this.slideToEditor();
        } else if (tabId === 'preview') {
            this.setActiveTab(this.tabs.preview);
            this.slideToPreview();
        }
    }

    resetActiveStates() {
        [this.tabs.editor, this.tabs.preview].forEach(btn => {
            btn?.classList.remove('active');
        });
    }

    setActiveTab(tabElement) {
        tabElement?.classList.add('active');
    }

    slideToEditor() {
        if (this.tabs.slidingContainer) {
            this.tabs.slidingContainer.style.transform = 'translateX(0%)';
        }
    }

    slideToPreview() {
        if (this.tabs.slidingContainer) {
            this.tabs.slidingContainer.style.transform = 'translateX(-50%)';
        }
        // Update preview when switching to preview tab
        if (this.previewManager) {
            const editorArea = document.getElementById('readme-editor');
            if (editorArea) {
                this.previewManager.updatePreview(editorArea.value);
            }
        }
    }
}

export const tabManager = new TabManager();
