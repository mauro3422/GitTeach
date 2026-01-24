/**
 * TextScalingManager.js
 *
 * ROBUST PATTERN: Single Source of Truth for Text Rendering
 *
 * Responsabilidad:
 * - Centraliza TODA la lógica de escalado de texto
 * - Proporciona medición robusta (real + fallback heurístico)
 * - Garantiza consistencia entre cálculo de bounds y rendering
 *
 * Principios:
 * 1. ÚNICO lugar para calcular font scaling
 * 2. MISMA lógica para medición y rendering
 * 3. Fallback robusto para entornos sin canvas (Vitest/JSDOM)
 */

import { ScalingCalculator } from './ScalingCalculator.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';

export const TextScalingManager = {
    /**
     * Dummy canvas context para medición de texto sin DOM
     * Se crea lazy cuando es necesario
     */
    _dummyCtx: null,

    /**
     * ROBUST: Obtiene un contexto de canvas para medición de texto
     * Prioridad: ctx proporcionado > dummy ctx > fallback null
     */
    _getTextContext(ctx) {
        if (ctx) return ctx;

        // Lazy init dummy canvas if needed
        if (!this._dummyCtx && typeof document !== 'undefined') {
            try {
                this._dummyCtx = document.createElement('canvas').getContext('2d');
            } catch (e) {
                console.warn('[TextScalingManager] Canvas not available, using heuristic fallback');
            }
        }

        return this._dummyCtx;
    },

    /**
     * CORE: Calcula el font scale correcto para un zoom dado
     * Single Source of Truth para scaling de fuentes
     *
     * @param {number} zoomScale - Current zoom level
     * @param {number} baseFontSize - Base font size in world units
     * @returns {number} Font scale factor
     */
    getFontScale(zoomScale, baseFontSize = DESIGNER_CONSTANTS.TYPOGRAPHY.BASE_FONT_SIZE) {
        return ScalingCalculator.getFontScale(zoomScale, baseFontSize);
    },

    /**
     * CORE: Calcula el tamaño de fuente en world space
     *
     * @param {number} baseFontSize - Base font size
     * @param {number} zoomScale - Current zoom level
     * @returns {number} Font size in world units
     */
    getWorldFontSize(baseFontSize, zoomScale) {
        const fScale = this.getFontScale(zoomScale, baseFontSize);
        return baseFontSize * fScale;
    },

    /**
     * ROBUST: Mide el ancho de un texto usando measureText (con fallback heurístico)
     *
     * @param {CanvasRenderingContext2D|null} ctx - Canvas context (puede ser null)
     * @param {string} text - Texto a medir
     * @param {number} fontSize - Tamaño de fuente en world space
     * @param {string} fontFamily - Familia de fuente
     * @returns {number} Ancho del texto en world units
     */
    measureTextWidth(ctx, text, fontSize, fontFamily = null) {
        if (!text) return 0;

        const activeCtx = this._getTextContext(ctx);
        const font = fontFamily || (typeof window !== 'undefined' && window.ThemeManager
            ? window.ThemeManager.colors.fontMono
            : 'monospace');

        if (!activeCtx) {
            // Pure heuristic fallback (Vitest/JSDOM)
            return text.length * fontSize * 0.6;
        }

        // Aplicar fuente al contexto
        activeCtx.font = `${fontSize}px ${font}`;

        const measured = activeCtx.measureText(text).width;

        // JSDOM symptom detection: constant width or zero
        if (measured <= 0 || (text.length > 5 && measured < 5)) {
            return text.length * fontSize * 0.6;
        }

        return measured;
    },

    /**
     * UNIFIED: Calcula el ancho mínimo necesario para un título de container
     * Usa medición REAL de texto (no heurística)
     *
     * @param {string} label - Label text
     * @param {number} zoomScale - Current zoom level
     * @param {CanvasRenderingContext2D|null} ctx - Canvas context (opcional)
     * @returns {number} Minimum width in world units
     */
    calculateContainerTitleWidth(label, zoomScale, ctx = null) {
        if (!label) return DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_W;

        const text = label.toUpperCase();
        const baseFontSize = DESIGNER_CONSTANTS.TYPOGRAPHY.CONTAINER_FONT_SIZE;
        const { TITLE_PADDING } = DESIGNER_CONSTANTS.LAYOUT;

        // CRITICAL: Usar el MISMO fScale que usa el renderer
        const fScale = this.getFontScale(zoomScale, baseFontSize);
        const worldFontSize = baseFontSize * fScale;

        // Medición REAL del texto
        const textWidth = this.measureTextWidth(ctx, text, worldFontSize);

        // Padding también debe escalarse
        const paddingWorld = TITLE_PADDING * fScale;
        const totalWidth = textWidth + paddingWorld;

        return Math.max(DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_W, totalWidth);
    },

    /**
     * UNIFIED: Calcula líneas de texto con word-wrapping
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} text - Full text
     * @param {number} maxWidth - Maximum width per line
     * @param {number} fontSize - Font size in world units
     * @param {string} fontFamily - Font family
     * @returns {Array<string>} Array of wrapped lines
     */
    calculateWrappedLines(ctx, text, maxWidth, fontSize, fontFamily = null) {
        if (!text || text.trim() === '') return [''];

        const activeCtx = this._getTextContext(ctx);
        if (!activeCtx) {
            // Fallback: simple split by words
            return text.split(' ');
        }

        const font = fontFamily || (typeof window !== 'undefined' && window.ThemeManager
            ? window.ThemeManager.colors.fontMono
            : 'monospace');

        activeCtx.font = `${fontSize}px ${font}`;

        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            const width = activeCtx.measureText(testLine).width;

            if (width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine.trim()) {
            lines.push(currentLine.trim());
        }

        return lines.length > 0 ? lines : [''];
    },

    /**
     * HELPER: Aplica fuente a un contexto de canvas
     * Centraliza la lógica de configuración de fuente
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} fontSize - Font size in world units
     * @param {boolean} bold - Bold font
     * @param {string} fontFamily - Font family
     */
    applyFont(ctx, fontSize, bold = false, fontFamily = null) {
        const font = fontFamily || ThemeManager.colors.fontMono || 'monospace';
        ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ${font}`;
    },

    /**
     * VALIDATION: Verifica que los parámetros de texto sean válidos
     * Auto-corrige valores inválidos
     *
     * @param {Object} params - Text rendering parameters
     * @returns {Object} Validated parameters
     */
    validateTextParams(params) {
        const { fontSize, zoomScale, text } = params;

        const validated = { ...params };

        // Auto-corrección de valores inválidos
        if (!fontSize || fontSize <= 0) {
            console.warn('[TextScalingManager] Invalid fontSize, using BASE_FONT_SIZE');
            validated.fontSize = DESIGNER_CONSTANTS.TYPOGRAPHY.BASE_FONT_SIZE;
        }

        if (!zoomScale || zoomScale <= 0) {
            console.warn('[TextScalingManager] Invalid zoomScale, using 1.0');
            validated.zoomScale = 1.0;
        }

        if (typeof text !== 'string') {
            console.warn('[TextScalingManager] Invalid text type, converting to string');
            validated.text = String(text || '');
        }

        return validated;
    }
};

/**
 * EXPORT: Exponer globalmente para debugging (solo en desarrollo)
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.TextScalingManager = TextScalingManager;
}
