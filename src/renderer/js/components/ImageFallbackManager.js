export class ImageFallbackManager {
    static async handleImageError(imgElement, id, url) {
        console.warn(`[ImageFallbackManager] 🔄 Fallback activado para: ${id}. Intentando vía IPC Bridge...`);
        try {
            const result = await window.utilsAPI.getImageBase64(url);
            if (result.success && result.data) {
                imgElement.src = result.data;
                console.log(`[ImageFallbackManager] ✅ CARGADO vía Bridge: ${id}`);
            } else {
                throw new Error(result.error || 'Bridge returned no data');
            }
        } catch (e) {
            console.error(`[ImageFallbackManager] ❌ FALLO TOTAL en: ${id} | Error:`, e.message);
            this.showFallbackIcon(imgElement);
        }
    }

    static showFallbackIcon(imgElement) {
        imgElement.style.display = 'none';
        imgElement.parentElement.innerHTML = '<div class="widget-icon-fallback">⚠️</div>';
    }
}

export const imageFallbackManager = new ImageFallbackManager();
