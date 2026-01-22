/**
 * CanvasPrimitives.js
 * Library of pure drawing functions using ThemeManager.
 * Replaces duplicate drawing logic across renderers.
 */

import { ThemeManager } from './ThemeManager.js';

export const CanvasPrimitives = {
    /**
     * Draws a rounded rectangle with "Glassmorphism" style.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} radius - Corner radius
     */
    drawGlassPanel(ctx, x, y, w, h, radius = 8, styleOverrides = {}) {
        ctx.save();
        ctx.beginPath(); // CRITICAL: Start a fresh path for this panel

        // 1. SOLID BACKING (Prevents shadow bleeding from behind)
        ctx.save();
        ctx.beginPath(); // Also here for safety during fill
        this.roundRect(ctx, x - w / 2, y - h / 2, w, h, radius);
        ctx.fillStyle = 'rgba(13, 17, 23, 0.75)';
        ctx.shadowColor = 'transparent';
        ctx.fill();
        ctx.restore();

        // 2. GLASS FILL
        ctx.beginPath(); // Fresh path for fill
        ctx.fillStyle = ThemeManager.effects.glass.color;
        this.roundRect(ctx, x - w / 2, y - h / 2, w, h, radius);
        ctx.fill();

        // 3. NEON BORDER + GLOW (Triple-stroke technique for maximum neon effect)
        const neonColor = styleOverrides.shadowColor || styleOverrides.borderColor || ThemeManager.colors.accent;
        const baseIntensity = styleOverrides.shadowBlur || 15;
        const isResizing = styleOverrides.isResizing || false;
        const isHovered = styleOverrides.isHovered || false;

        // Layer 1: Wide diffuse glow (outermost)
        ctx.save();
        ctx.beginPath();
        ctx.shadowBlur = isResizing ? baseIntensity * 5 : (isHovered ? baseIntensity * 3.5 : baseIntensity * 1.5);
        ctx.shadowColor = neonColor;
        ctx.lineWidth = isResizing ? 4 : (isHovered ? 3 : 2);
        ctx.strokeStyle = neonColor + '30'; // 19% opacity
        this.roundRect(ctx, x - w / 2, y - h / 2, w, h, radius);
        ctx.stroke();
        ctx.restore();

        // Layer 2: Medium glow
        ctx.save();
        ctx.beginPath();
        ctx.shadowBlur = isResizing ? baseIntensity * 3 : (isHovered ? baseIntensity * 2 : baseIntensity * 1);
        ctx.shadowColor = neonColor;
        ctx.lineWidth = isResizing ? 3 : (isHovered ? 2.5 : 1.5);
        ctx.strokeStyle = neonColor + '60'; // 37% opacity
        this.roundRect(ctx, x - w / 2, y - h / 2, w, h, radius);
        ctx.stroke();
        ctx.restore();

        // Layer 3: Crisp inner border (Full neon color)
        ctx.save();
        ctx.beginPath();
        ctx.shadowBlur = isResizing ? 40 : (isHovered ? 20 : 10);
        ctx.shadowColor = neonColor;
        ctx.lineWidth = isResizing ? 3.5 : (isHovered ? 2.5 : 1.5);
        ctx.strokeStyle = neonColor; // Full opacity neon color
        this.roundRect(ctx, x - w / 2, y - h / 2, w, h, radius);
        ctx.stroke();
        ctx.restore();

        // Layer 4: THE NEON CORE (Thin white/pale line for maximum brightness)
        ctx.save();
        ctx.beginPath();
        // Very thin, very bright core
        ctx.lineWidth = isHovered || isResizing ? 1.2 : 0.8;
        ctx.strokeStyle = '#ffffffaa'; // 66% white overlay
        ctx.shadowBlur = isResizing ? 10 : (isHovered ? 5 : 2);
        ctx.shadowColor = '#ffffff';
        this.roundRect(ctx, x - w / 2, y - h / 2, w, h, radius);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    },

    /**
     * Draws a notification Badge (e.g., message count).
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string|number} text 
     * @param {number} x 
     * @param {number} y 
     * @param {string} color 
     */
    drawBadge(ctx, text, x, y, color = ThemeManager.colors.accent) {
        ctx.save();
        ctx.beginPath(); // Safe path start
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(text, x, y);
        ctx.restore();
    },

    /**
     * Draws a standard Node circle.
     */
    drawNodeCircle(ctx, x, y, radius, color, isHovered) {
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = ThemeManager.colors.node;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill(); // Fill first

        if (isHovered) {
            // Neon Glow Layer
            ctx.save();
            ctx.strokeStyle = color;
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
            ctx.lineWidth = 3.5;
            ctx.stroke();
            ctx.restore();

            // Bright Core Layer
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#ffffffaa';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ffffff';
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    },

    // Helper wrapper for roundRect compatibility
    roundRect(ctx, x, y, w, h, r) {
        // We handle beginPath calls at a higher level to allow fill AND stroke of same path
        // but just in case, we check native roundRect
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
        } else {
            // Manual fallback implementation
            // NO beginPath here either, to allow external path management
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }
    }
};
