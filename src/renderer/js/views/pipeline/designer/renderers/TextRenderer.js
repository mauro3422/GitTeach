/**
 * TextRenderer.js
 * Sistema unificado para renderizado de texto en canvas
 * Centraliza lógica de multilinea, tooltips y estilos de fuente
 */

import { ThemeManager } from '../../../../core/ThemeManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';

export const TextRenderer = {
    /**
     * Configuraciones de fuente predefinidas
     */
    FONTS: {
        MONO: ThemeManager.colors.fontMono,
        UI: ThemeManager.colors.fontMono,
        SANS: 'Arial, sans-serif'
    },

    /**
     * Renderiza texto multilinea con word-wrapping automático
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text - Texto a renderizar
     * @param {number} x, y - Posición inicial (top-left)
     * @param {Object} options - Configuración
     */
    drawMultilineText(ctx, text, x, y, options = {}) {
        const {
            maxWidth = 200,
            lineHeight = 16,
            font = this.FONTS.UI,
            color = ThemeManager.colors.text,
            align = 'left',
            maxLines = null,
            ellipsis = '...'
        } = options;

        // Guardar estado del contexto
        ctx.save();

        // Aplicar configuración de fuente y color
        // Aplicar configuración de fuente y color
        // FIX: Support full font strings (containing 'px') to allow decoupling fontSize from lineHeight
        if (typeof font === 'string' && font.includes('px')) {
            ctx.font = font;
        } else {
            ctx.font = `${lineHeight}px ${font}`; // Legacy behavior: lineHeight ~= fontSize
        }
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'top';

        // Calcular líneas
        const lines = this.calculateLines(ctx, text, maxWidth);

        // Aplicar límite de líneas si especificado
        let displayLines = lines;
        let needsEllipsis = false;

        if (maxLines && lines.length > maxLines) {
            displayLines = lines.slice(0, maxLines - 1);
            needsEllipsis = true;
        }

        // Renderizar líneas
        let currentY = y;
        displayLines.forEach((line, index) => {
            let lineToDraw = line;

            // Agregar ellipsis en la última línea si es necesario
            if (needsEllipsis && index === displayLines.length - 1) {
                lineToDraw = this._truncateWithEllipsis(ctx, line, maxWidth, ellipsis);
            }

            // Calcular posición X según alineación
            let drawX = x;
            if (align === 'center') {
                drawX = x + maxWidth / 2;
            } else if (align === 'right') {
                drawX = x + maxWidth;
            }

            ctx.fillText(lineToDraw, drawX, currentY);
            currentY += lineHeight;
        });

        // Restaurar estado del contexto
        ctx.restore();
    },

    /**
     * Renderiza tooltip estandarizado con fondo semitransparente
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text - Contenido del tooltip
     * @param {number} x, y - Posición del puntero (tooltip se posiciona automáticamente)
     * @param {Object} style - Configuración visual
     */
    drawTooltip(ctx, text, x, y, style = {}) {
        const { TOOLTIP } = DESIGNER_CONSTANTS.VISUAL;
        const {
            bgColor = ThemeManager.colors.tooltipBg,
            borderColor = ThemeManager.colors.tooltipBorder,
            textColor = ThemeManager.colors.text,
            maxWidth = TOOLTIP.MAX_WIDTH,
            padding = TOOLTIP.PADDING,
            borderRadius = DESIGNER_CONSTANTS.VISUAL.PANEL_RADIUS.TOOLTIP,
            fontSize = TOOLTIP.FONT_SIZE
        } = style;

        // Calcular dimensiones del tooltip
        ctx.save();
        ctx.font = `${fontSize}px ${this.FONTS.UI}`;

        const lines = this.calculateLines(ctx, text, maxWidth - padding * 2);
        const tooltipWidth = maxWidth;
        const tooltipHeight = lines.length * (fontSize + DESIGNER_CONSTANTS.TYPOGRAPHY.LINE_HEIGHT_OFFSET) + padding * 2;

        // Posicionar tooltip para que quepa en pantalla (simple por ahora)
        const { OFFSET } = DESIGNER_CONSTANTS.VISUAL.TOOLTIP;
        let tooltipX = x + OFFSET; // Offset del puntero
        let tooltipY = y - tooltipHeight / 2;

        // Ajustar si sale de pantalla (básico)
        const canvas = ctx.canvas;
        if (tooltipX + tooltipWidth > canvas.width) {
            tooltipX = x - tooltipWidth - DESIGNER_CONSTANTS.VISUAL.TOOLTIP.OFFSET;
        }
        if (tooltipY < 0) tooltipY = 0;
        if (tooltipY + tooltipHeight > canvas.height) {
            tooltipY = canvas.height - tooltipHeight;
        }

        // Dibujar fondo con sombra
        ctx.shadowBlur = 15;
        ctx.shadowColor = ThemeManager.effects.shadow.md.color;
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;

        if (ctx.roundRect) {
            ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, borderRadius);
        } else {
            ctx.rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Resetear sombra para el texto
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = textColor;

        // Renderizar líneas de texto
        lines.forEach((line, index) => {
            const lineY = tooltipY + padding + index * (fontSize + DESIGNER_CONSTANTS.TYPOGRAPHY.LINE_HEIGHT_OFFSET);
            ctx.fillText(line, tooltipX + padding, lineY);
        });

        ctx.restore();
    },

    /**
     * Utilidad pura: calcula líneas sin dibujar (para cálculos de layout)
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text - Texto completo
     * @param {number} maxWidth - Ancho máximo por línea
     * @param {string} font - Fuente a usar (opcional, debe estar ya aplicada a ctx)
     * @returns {Array<string>} Array de líneas calculadas
     */
    calculateLines(ctx, text, maxWidth, font = null) {
        if (!text || text.trim() === '') return [''];

        // Aplicar fuente temporalmente si especificada
        let originalFont = null;
        if (font) {
            originalFont = ctx.font;
            ctx.font = font;
        }

        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine.length > 0) {
                // La línea sería demasiado larga, guardar línea actual y empezar nueva
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        });

        // Agregar última línea
        if (currentLine.trim()) {
            lines.push(currentLine.trim());
        }

        // Restaurar fuente original si se cambió
        if (originalFont) {
            ctx.font = originalFont;
        }

        return lines.length > 0 ? lines : [''];
    },

    /**
     * Trunca texto con ellipsis manteniendo el ancho máximo
     * @private
     */
    _truncateWithEllipsis(ctx, text, maxWidth, ellipsis = '...') {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }

        let truncated = text;
        while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }

        return truncated + ellipsis;
    }
};
