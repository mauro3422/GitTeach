import { widgetUrlManager } from './WidgetUrlManager.js';
import { imageFallbackManager } from './ImageFallbackManager.js';

export class WidgetCardRenderer {
    static createCard(tool, username) {
        const card = document.createElement('div');
        card.className = 'widget-card-item';
        card.dataset.id = tool.id;

        const previewUrl = widgetUrlManager.getPreviewUrl(tool, username);
        const hasVisualPreview = !!previewUrl;

        card.innerHTML = `
            <div class="widget-preview-container ${!hasVisualPreview ? 'no-preview' : ''}">
                <div class="widget-preview-area" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    ${hasVisualPreview
                ? `<img src="${previewUrl}"
                        class="widget-preview-img"
                        alt="${tool.name}"
                        referrerPolicy="no-referrer"
                        style="opacity: 1;"
                        onload="console.log('[WidgetGallery] ✅ EXITO Directo:', '${tool.id}');"
                        onerror="window.WidgetCardRenderer.handleImageError(this, '${tool.id}', '${previewUrl}')">`
                : `<div class="widget-icon-fallback">🧩</div>`
            }
                </div>
                <div class="widget-badge">IA Ready</div>
            </div>
            <div class="widget-info">
                <h4>${tool.name}</h4>
                <p>${tool.description}</p>
            </div>
            <div class="widget-actions">
                <button class="github-btn btn-sm btn-primary-compact">✨ Insertar</button>
            </div>
        `;

        return card;
    }

    // Static method for image error handling - delegates to ImageFallbackManager
    static async handleImageError(imgElement, id, url) {
        await imageFallbackManager.handleImageError(imgElement, id, url);
    }
}

export const widgetCardRenderer = new WidgetCardRenderer();
window.WidgetCardRenderer = WidgetCardRenderer;
