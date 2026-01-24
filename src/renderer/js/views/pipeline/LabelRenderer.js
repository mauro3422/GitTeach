import { ThemeManager } from '../../core/ThemeManager.js';
import { GeometryUtils } from './designer/GeometryUtils.js';
import { TextScalingManager } from './designer/utils/TextScalingManager.js';

export const LabelRenderer = {
    /**
     * Draw main label and sublabel
     * vScale is the inflation factor from GeometryUtils.
     * zoomScale is used ONLY for screen-space consistent elements (strokes, padding).
     */
    drawNodeLabel(ctx, node, x, y, isHovered, zoomScale = 1, dynamicRadius = null, vScale = 1) {
        if (!node.label) return;

        const isSatellite = node.isSatellite === true;
        const nodeGeom = ThemeManager.geometry.node;

        // Base sizes (World Units)
        // We increase base size slightly for 'Glass' aesthetics
        const baseFontSize = isSatellite ? 16 : (isHovered ? 28 : 24);

        // ROBUST PATTERN: Use TextScalingManager (Single Source of Truth)
        const worldFontSize = TextScalingManager.getWorldFontSize(baseFontSize, zoomScale);

        // PROBE: Log scaling details
        if (window.DEBUG_SCALING) {
            console.log(`[PROBE:SCALING] node:${node.label} zoom:${zoomScale.toFixed(2)} vScale:${vScale.toFixed(2)} worldFont:${worldFontSize.toFixed(1)} screenFont:${(worldFontSize * zoomScale).toFixed(1)}px`);
        }

        // Use dynamicRadius (inflated) or base radius (scaled by zoom if not dynamic)
        const radius = dynamicRadius || ((isSatellite ? nodeGeom.satelliteRadius : nodeGeom.defaultRadius) * zoomScale);

        const padding = 12 / zoomScale; // Padding stays consistent on screen
        const yOffset = node.labelPosition === 'top' ? -(radius + padding) : (radius + padding);
        const labelY = y + yOffset;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const fontFam = ThemeManager.colors.fontMono || 'monospace';
        ctx.font = `bold ${worldFontSize}px ${fontFam}`;

        // Contrast stroke (Consistent 2px on screen)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5 / zoomScale;
        ctx.strokeText(node.label, x, labelY);

        ctx.fillStyle = isHovered ? ThemeManager.colors.textBright : (node.isSatellite ? (node.color || ThemeManager.colors.textMuted) : ThemeManager.colors.text);
        ctx.fillText(node.label, x, labelY);

        ctx.restore();
    },

    drawNodeIcon(ctx, icon, x, y, isSatellite, zoomScale = 1, dynamicRadius = null) {
        const nodeGeom = ThemeManager.geometry.node;
        const radius = dynamicRadius || ((isSatellite ? nodeGeom.satelliteRadius : nodeGeom.defaultRadius) * zoomScale);

        // Scale icon proportional to radius
        const iconSize = radius * 1.1;

        ctx.save();
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ThemeManager.colors.textBright;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4 / zoomScale; // Shadow stays consistent on screen
        ctx.fillText(icon, x, y);
        ctx.restore();
    },

    drawStandardText(ctx, text, x, y, options = {}) {
        const {
            fontSize = 18,
            color = ThemeManager.colors.textMuted,
            bold = false,
            zoom = 1.0,
            vScale = 1.0
        } = options;

        // ROBUST PATTERN: Use TextScalingManager (Single Source of Truth)
        const fScale = options.fScale || TextScalingManager.getFontScale(zoom, fontSize);
        const worldSize = fontSize * (options.vScale || fScale);

        ctx.save();
        TextScalingManager.applyFont(ctx, worldSize, bold);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5 / zoom;
        ctx.strokeText(text, x, y);

        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.restore();
    }
};
