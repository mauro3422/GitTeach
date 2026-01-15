// src/main/services/firewallService.js
// Service: Intercepts outgoing requests to spoof headers for anti-bot bypass.

import { session } from 'electron';

/**
 * Initializes the network interceptor.
 * Spoofs Origin, Referer, and User-Agent for requests to Vercel, Heroku, and GitHub user content.
 */
export function init() {
    console.log('[Firewall] Initializing network interceptor...');
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['https://*.vercel.app/*', 'https://*.herokuapp.com/*', 'https://*.githubusercontent.com/*'] },
        (details, callback) => {
            // Spoofing identity to look like a real browser from GitHub
            details.requestHeaders['Origin'] = 'https://github.com';
            details.requestHeaders['Referer'] = 'https://github.com/';
            details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            details.requestHeaders['Accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
            details.requestHeaders['Accept-Language'] = 'es-ES,es;q=0.9,en;q=0.8';
            details.requestHeaders['Sec-Fetch-Dest'] = 'image';
            details.requestHeaders['Sec-Fetch-Mode'] = 'no-cors';
            details.requestHeaders['Sec-Fetch-Site'] = 'cross-site';
            details.requestHeaders['DNT'] = '1';
            details.requestHeaders['Upgrade-Insecure-Requests'] = '1';

            // Sec-CH-UA headers (Modern Chrome identification)
            details.requestHeaders['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
            details.requestHeaders['sec-ch-ua-mobile'] = '?0';
            details.requestHeaders['sec-ch-ua-platform'] = '"Windows"';

            callback({ requestHeaders: details.requestHeaders });
        }
    );
    console.log('[Firewall] ✅ Interceptor active.');
}

export default { init };
