/**
 * VisualEffects.js
 * Sistema unificado de efectos visuales para canvas
 * Centraliza glows, shadows, glass panels y efectos reutilizables
 */

import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';

export const VisualEffects = {
    /**
     * Efectos predefinidos para consistencia
     */
    EFFECTS: {
        HOVER_GLOW: { intensity: 1.2 },
        ACTIVE_GLOW: { intensity: 1.8 },
        SUBTLE_SHADOW: { blur: 8, color: 'rgba(0,0,0,0.3)' },
        STRONG_SHADOW: { blur: 20, color: 'rgba(0,0,0,0.5)' }
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
        const blur = Math.max(8, Math.min(40, 15 * intensity));
        const alpha = Math.max(0.3, Math.min(1.0, 0.6 * intensity));

        // Aplicar glow
        ctx.shadowBlur = blur;
        ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    },

    /**
     * Dibuja panel tipo vidrio con borde neón
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x, y, w, h - Rectángulo del panel
     * @param {number} radius - Radio de esquinas redondeadas
     * @param {Object} style - Configuración visual
     */
    drawGlassPanel(ctx, x, y, w, h, radius, style = {}) {
        const {
            shadowColor = null,
            shadowBlur = 15,
            borderColor = ThemeManager.colors.border,
            borderWidth = 1.5,
            glassOpacity = 0.1,
            isResizing = false,
            isHovered = false
        } = style;

        ctx.save();

        // Aplicar sombra si especificada
        if (shadowColor) {
            ctx.shadowBlur = shadowBlur;
            ctx.shadowColor = shadowColor;
        }

        // Panel de vidrio semitransparente
        ctx.fillStyle = `rgba(255, 255, 255, ${glassOpacity})`;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;

        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, radius);
        } else {
            // Fallback para navegadores sin roundRect
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + w - radius, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
            ctx.lineTo(x + w, y + h - radius);
            ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            ctx.lineTo(x + radius, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        ctx.fill();
        ctx.stroke();

        // Efecto adicional para resizing/hover
        if (isResizing || isHovered) {
            ctx.shadowBlur = isResizing ? 25 : 18;
            ctx.shadowColor = shadowColor || borderColor;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = isResizing ? 2 : 1.5;
            ctx.stroke();
        }

        ctx.restore();
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
            handleSize = 12,
            activeCorner = null
        } = style;

        if (!corners || corners.length !== 4) return;

        ctx.save();

        corners.forEach((corner, index) => {
            const isActive = activeCorner === index;
            const size = (isActive ? handleSize * 1.2 : handleSize) / zoomScale;

            // Glow para handles
            ctx.shadowBlur = isActive ? 15 : 8;
            ctx.shadowColor = color;

            // Handle cuadrado
            ctx.fillStyle = isActive ? color : 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = isActive ? 2 : 1.5;

            const halfSize = size / 2;
            ctx.fillRect(corner.x - halfSize, corner.y - halfSize, size, size);
            ctx.strokeRect(corner.x - halfSize, corner.y - halfSize, size, size);

            // Glow adicional para active
            if (isActive) {
                ctx.shadowBlur = 25;
                ctx.lineWidth = 3;
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
            ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.3)';
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
