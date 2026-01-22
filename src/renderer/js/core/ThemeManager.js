/**
 * ThemeManager.js
 * Centralizes the visual aesthetics (colors, shadows, glassmorphism)
 * to ensure consistency between the Routing Designer and Pipeline Visualizer.
 */

export class ThemeManager {
    // Neon color palette for random border assignment
    static neonPalette = [
        '#4ade80', // Vibrant Green
        '#60a5fa', // Vibrant Blue
        '#f472b6', // Vibrant Pink
        '#22d3ee', // Vibrant Cyan
        '#fb923c', // Vibrant Orange
        '#c084fc', // Vibrant Purple
        '#fb7185', // Vibrant Coral/Red
        '#a3e635', // Vibrant Lime
    ];

    // PERSISTENT color cache - survives node object recreation and HMR
    static getNeonColorForId(nodeId) {
        if (!nodeId) return this.colors.accent;

        // Ensure global cache exists
        if (!window.__GITEACH_COLOR_CACHE__) {
            window.__GITEACH_COLOR_CACHE__ = new Map();
        }

        const cache = window.__GITEACH_COLOR_CACHE__;
        if (!cache.has(nodeId)) {
            const color = this.getRandomNeonColor(nodeId);
            cache.set(nodeId, color);
            console.log(`[Color] 🎨 Assigned persistent color to ${nodeId}: ${color}`);
        }
        return cache.get(nodeId);
    }

    static getRandomNeonColor(seed = null) {
        if (seed !== null) {
            // Stronger hash for better distribution
            let hash = 5381;
            const str = String(seed);
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) + hash) + str.charCodeAt(i) + (i * 31);
            }
            return this.neonPalette[Math.abs(hash) % this.neonPalette.length];
        }
        return this.neonPalette[Math.floor(Math.random() * this.neonPalette.length)];
    }

    static get colors() {
        return {
            background: '#0d1117',
            panelBg: 'rgba(22, 27, 34, 0.9)',
            primary: '#2f81f7',
            accent: '#3fb950',
            text: '#e6edf3',
            textDim: '#8b949e',
            border: '#30363d',
            // Semantic colors
            node: 'rgba(22, 27, 34, 0.9)',
            container: 'rgba(22, 27, 34, 0.5)',
            connection: '#58a6ff',
            connectionActive: '#2f81f7'
        };
    }

    static get effects() {
        return {
            glass: {
                blur: 10,
                color: 'rgba(22, 27, 34, 0.75)',
                border: 'rgba(240, 246, 252, 0.1)'
            },
            shadow: {
                sm: { blur: 4, color: 'rgba(0,0,0,0.3)' },
                md: { blur: 15, color: 'rgba(0,0,0,0.4)' },
                glow: { blur: 20, color: '#2f81f7' }
            }
        };
    }
}
