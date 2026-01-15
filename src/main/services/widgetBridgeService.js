// src/main/services/widgetBridgeService.js
// Service: Fetches external images with anti-bot bypass strategies.

/**
 * Fetches an image URL using a 3-step retry strategy.
 * 1. GitHub Identity (Referer: github.com)
 * 2. Clean Browser (No Referer)
 * 3. Weserv Proxy (Final fallback)
 * @param {string} url - The image URL to fetch.
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
async function getImageAsBase64(url) {
    const fetchWithHeaders = async (targetUrl, mode = 'github') => {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };

        if (mode === 'github') {
            headers['Referer'] = 'https://github.com/';
            headers['Origin'] = 'https://github.com';
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            return await fetch(targetUrl, {
                headers,
                signal: controller.signal,
                redirect: 'follow'
            });
        } finally {
            clearTimeout(timeoutId);
        }
    };

    try {
        console.log(`[WidgetBridge] 🚀 Fetching: ${url}`);

        // Attempt 1: GitHub Identity
        let response = await fetchWithHeaders(url, 'github');

        // Attempt 2: Clean Browser (If 1 fails with 4xx or 5xx)
        if (!response.ok) {
            console.warn(`[WidgetBridge] ⚠️ Attempt 1 failed (${response.status}). Retrying as Clean Browser...`);
            response = await fetchWithHeaders(url, 'clean');
        }

        // Attempt 3: Weserv Proxy (Final Strategy)
        if (!response.ok) {
            console.warn(`[WidgetBridge] ⚠️ Attempt 2 failed (${response.status}). Falling back to Weserv...`);
            const cleanUrl = url.replace(/^https?:\/\//, '');
            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&nps=1&output=png`;
            response = await fetchWithHeaders(proxyUrl, 'clean');
        }

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        const base64 = Buffer.from(buffer).toString('base64');

        console.log(`[WidgetBridge] ✅ SUCCESS: ${url.substring(0, 50)}...`);
        return { success: true, data: `data:${contentType};base64,${base64}` };
    } catch (error) {
        console.error(`[WidgetBridge] ❌ FINAL FAILURE for ${url}:`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { getImageAsBase64 };
