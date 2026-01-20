export class PreviewManager {
    constructor() {
        this.previewContainer = null;
    }

    init(previewContainer) {
        this.previewContainer = previewContainer;
        this.attachLivePreview();
    }

    attachLivePreview() {
        if (!this.previewContainer) return;

        const editorArea = document.getElementById('readme-editor');
        if (!editorArea) return;

        const render = () => {
            const text = editorArea.value;
            this.previewContainer.innerHTML = window.marked ? window.marked.parse(text) : text;
        };

        editorArea.addEventListener('input', render);
        render(); // Initial render
    }

    updatePreview(text) {
        if (this.previewContainer) {
            this.previewContainer.innerHTML = window.marked ? window.marked.parse(text) : text;
        }
    }
}

export const previewManager = new PreviewManager();
