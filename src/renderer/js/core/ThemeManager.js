/**
 * ThemeManager.js
 * Centralizes the visual aesthetics (colors, shadows, glassmorphism)
 * to ensure consistency between the Routing Designer and Pipeline Visualizer.
 */

export class ThemeManager {
    // Neon color palette for random border assignment
    static neonPalette = [
        '#00ff66', // Pure Neon Green
        '#00ccff', // Pure Neon Blue
        '#ff00ff', // Pure Neon Magenta
        '#00ffff', // Pure Neon Cyan
        '#ff9900', // Pure Neon Orange
        '#cc33ff', // Deep Neon Purple
        '#ff3333', // Pure Neon Red
        '#ccff00', // Pure Neon Lime
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

    constructor() {
        // Z-Index Layers
        this.layers = {
            base: 0,
            hover: 10,
            select: 20,
            connecting: 30,
            dragging: 40,
            resizing: 50,
            editor: 2000
        };

        this.navigation = {
            defaultZoom: 0.3,
            minZoom: 0.2,
            maxZoom: 5.0
        };

        this.geometry = {
            thresholds: {
                nodeHitBuffer: 20,
                connectionHitBuffer: 15
            },
            node: {
                defaultRadius: 35,
                satelliteRadius: 25,
                margin: 20,
                baseGapY: 120,
                repulsionBuffer: 15,
                repulsionForce: 5
            },
            orbit: {
                defaultScale: 800
            },
            sticky: {
                padding: 15,
                buffer: 40,
                hitBuffer: 20
            },
            arrow: {
                headLength: 10,
                angle: Math.PI / 6
            },
            grid: {
                size: 100,
                buffer: 10,
                spacing: 120
            },
            hydration: {
                defaultScale: 1200,
                orbitRadius: 0.18,
                childGapX: 220,
                childOffsetTop: 50,
                defaultWidth: 180,
                defaultHeight: 100
            },
            layout: {
                container: {
                    padding: 60,
                    minWidth: 140,
                    minHeight: 100,
                    extraHeight: 40,
                    growthPerChild: 5,
                    maxGrowth: 40,
                    labelCharWidth: 13,
                    labelPadding: 10
                },
                physics: {
                    damping: 0.15,
                    epsilon: 0.5,
                    collisionBuffer: 20,
                    strength: 0.5
                }
            }
        };

        this._colors = {
            background: '#0d1117',
            panelBg: 'rgba(22, 27, 34, 0.9)',
            primary: '#00ccff',
            accent: '#00ff66',
            text: '#e6edf3',
            textDim: '#8b949e',
            border: '#444c56',
            node: 'rgba(22, 27, 34, 0.9)',
            container: 'rgba(22, 27, 34, 0.5)',
            connection: '#58a6ff',
            connectionActive: '#00ccff',
            error: '#f85149',
            success: '#238636',
            warning: '#fb923c',
            debug: '#ff00ff',
            hoverLight: '#e6edf3',
            hoverBorder: '#00ccff',
            tooltipBg: 'rgba(13, 17, 23, 0.98)',
            tooltipBorder: '#444c56',
            gridLine: 'rgba(48, 54, 61, 0.4)',
            glassBorderSubtle: 'rgba(255, 255, 255, 0.05)',
            drawerBg: '#0d1117',
            drawerBorder: '#30363d',
            drawerTextDim: '#8b949e',
            textMuted: '#8b949e',
            textBright: '#ffffff',
            borderSubtle: 'rgba(255, 255, 255, 0.1)',
            fontMono: '"Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            caret: '#3fb950',
            selection: 'rgba(63, 185, 80, 0.3)',
            dropTarget: 'rgba(0, 204, 255, 0.18)',
            editorBg: 'rgba(13, 17, 23, 0.1)'
        };

        this._effects = {
            glass: {
                blur: 10,
                color: 'rgba(22, 27, 34, 0.75)',
                border: 'rgba(240, 246, 252, 0.1)'
            },
            shadow: {
                sm: { blur: 4, color: 'rgba(0,0,0,0.3)' },
                subtle: { blur: 8, color: 'rgba(0,0,0,0.3)' },
                md: { blur: 15, color: 'rgba(0,0,0,0.4)' },
                lg: { blur: 20, color: 'rgba(0,0,0,0.5)' },
                strong: { blur: 20, color: 'rgba(0,0,0,0.5)' },
                glow: { blur: 20, color: '#00ccff' },
                tooltip: { blur: 15, color: 'rgba(0,0,0,0.4)' },
                neon: (color) => ({ blur: 25, color: color })
            },
            glow: {
                high: 2.5,
                medium: 1.8,
                low: 1.2,
                subtle: 0.8
            }
        };
    }

    static get instance() {
        if (!this._instance) this._instance = new ThemeManager();
        return this._instance;
    }

    static get colors() { return this.instance._colors; }
    static get effects() { return this.instance._effects; }
    static get geometry() { return this.instance.geometry; }
    static get layers() { return this.instance.layers; }

    static get overlays() {
        return {
            tooltip: 'rgba(13, 17, 23, 0.98)',
            glass: 'rgba(22, 27, 34, 0.75)',
            glassThin: 'rgba(22, 27, 34, 0.1)',
            selection: 'rgba(63, 185, 80, 0.3)',
            border: 'rgba(255, 255, 255, 0.05)',
            borderLight: 'rgba(255, 255, 255, 0.1)'
        };
    }
}
