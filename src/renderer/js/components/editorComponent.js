import { previewManager } from './PreviewManager.js';
import { tabManager } from './TabManager.js';
import { RendererLogger } from '../utils/RendererLogger.js';

export class EditorComponent {
    constructor() {
        this.tabs = {
            editor: null,
            preview: null,
            slidingContainer: null
        };
    }

    init() {
        this.tabs.editor = document.getElementById('btn-show-editor');
        this.tabs.preview = document.getElementById('btn-show-preview');
        this.tabs.slidingContainer = document.getElementById('editor-sliding-container');

        const previewContainer = document.getElementById('preview-container');

        if (!previewContainer) {
            RendererLogger.error('[EditorComponent] Missing preview container.');
            return;
        }

        // Initialize PreviewManager for live preview functionality
        previewManager.init(previewContainer);

        // Initialize TabManager for tab switching and sliding transitions
        tabManager.init(this.tabs.editor, this.tabs.preview, this.tabs.slidingContainer, previewManager);

        RendererLogger.info('[EditorComponent] Initialized correctly.');
    }
}

export const editorComponent = new EditorComponent();
