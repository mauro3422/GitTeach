/**
 * VisualEffects.js
 * Sistema unificado de efectos visuales para canvas
 * Centraliza glows, shadows, glass panels y efectos reutilizables
 */

import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';

export const VisualEffects = {
    /**
     * Efectos predefinidos para consistencia
     */
    EFFECTS: {
        HOVER_GLOW: { intensity: DESIGNER_CONSTANTS.VISUAL.GLOW.HOVER },
        ACTIVE_GLOW: { intensity: DESIGNER_CONSTANTS.VISUAL.GLOW.ACTIVE },
        SUBTLE_SHADOW: ThemeManager.effects.shadow.subtle,
        STRONG_SHADOW: ThemeManager.effects.shadow.strong
    },

    /**
     * Aplica glow neón al contexto actual
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} color - Color base (hex/rgb/hsl)
     * @param {number} intensity - Multiplicador de intensidad (0.0-2.0)
     */
    applyNeonGlow(ctx, color, intensity = 1.0) {
        // Convertir color a componentes RGB para manipulación
        const rgb = this._colorToRgb(color);
        if (!rgb) return;

        // Calcular intensidad de glow
        const { GLOW } = DESIGNER_CONSTANTS.VISUAL;
        const blur = Math.max(GLOW.MIN_BLUR, Math.min(GLOW.MAX_BLUR, GLOW.BASE_BLUR * intensity));
        const alpha = Math.max(0.4, Math.min(1.0, GLOW.BASE_ALPHA * intensity));

        // Aplicar glow
        ctx.shadowBlur = blur;
        ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    },

    /**
     * Dibuja panel tipo vidrio con borde neón delegando a CanvasPrimitives
     * Mantiene compatibilidad con coordenadas top-left pero usa el motor premium
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x, y, w, h - Rectángulo del panel (top-left)
     * @param {number} radius - Radio de esquinas redondeadas
     * @param {Object} style - Configuración visual
     */
    drawGlassPanel(ctx, x, y, w, h, radius, style = {}) {
        // Convertimos de top-left (x, y) a centro (centerX, centerY)
        // porque CanvasPrimitives.drawGlassPanel usa coordenadas basadas en centro
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        CanvasPrimitives.drawGlassPanel(ctx, centerX, centerY, w, h, radius, style);
    },

    /**
     * Dibuja handles de redimensionamiento en las esquinas
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array<{x,y}>} corners - Array de 4 objetos {x,y} para las esquinas
     * @param {number} zoomScale - Escala actual de zoom
     * @param {Object} style - Configuración de estilo
     */
    drawResizeHandles(ctx, corners, zoomScale, style = {}) {
        const {
            color = ThemeManager.colors.primary,
            handleSize = DESIGNER_CONSTANTS.BADGE?.SIZE || 12,
            activeCorner = null
        } = style;

        if (!corners || corners.length !== 4) return;

        ctx.save();

        corners.forEach((corner, index) => {
            const isActive = activeCorner === index;
            const size = (isActive ? handleSize * 1.2 : handleSize) / zoomScale;

            // Glow para handles
            const { GLOW } = DESIGNER_CONSTANTS.VISUAL;
            ctx.shadowBlur = isActive ? GLOW.BASE_BLUR : GLOW.MIN_BLUR;
            ctx.shadowColor = color;

            const { VISUAL } = DESIGNER_CONSTANTS;
            ctx.fillStyle = isActive ? color : ThemeManager.colors.text;
            ctx.strokeStyle = color;
            ctx.lineWidth = isActive ? VISUAL.BORDER.HOVERED : 1.5;

            const halfSize = size / 2;
            ctx.fillRect(corner.x - halfSize, corner.y - halfSize, size, size);
            ctx.strokeRect(corner.x - halfSize, corner.y - halfSize, size, size);

            // Glow adicional para active
            if (isActive) {
                const { GLOW, BORDER } = DESIGNER_CONSTANTS.VISUAL;
                ctx.shadowBlur = GLOW.BASE_BLUR;
                ctx.lineWidth = BORDER.SELECTED;
                ctx.strokeRect(corner.x - halfSize, corner.y - halfSize, size, size);
            }
        });

        ctx.restore();
    },

    /**
     * Aplica múltiples efectos combinados (glow + shadow)
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} effects - {glow: {color, intensity}, shadow: {blur, color}}
     */
    applyCombinedEffects(ctx, effects = {}) {
        const { glow, shadow } = effects;

        if (glow) {
            this.applyNeonGlow(ctx, glow.color, glow.intensity);
        }

        if (shadow) {
            ctx.shadowBlur = shadow.blur || 8;
            ctx.shadowColor = shadow.color || ThemeManager.effects.shadow.sm.color;
        }
    },

    /**
     * Limpia todos los efectos aplicados al contexto
     * @param {CanvasRenderingContext2D} ctx
     */
    clearEffects(ctx) {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1.0;
    },

    /**
     * Utilidad para convertir colores a RGB
     * @private
     * @param {string} color - Color en cualquier formato CSS
     * @returns {Object|null} {r, g, b} o null si inválido
     */
    _colorToRgb(color) {
        // Crear un elemento temporal para parsear el color
        const temp = document.createElement('div');
        temp.style.color = color;
        document.body.appendChild(temp);

        const computed = getComputedStyle(temp).color;
        document.body.removeChild(temp);

        // Parsear rgb(r, g, b) o rgba(r, g, b, a)
        const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }

        return null;
    }
};
