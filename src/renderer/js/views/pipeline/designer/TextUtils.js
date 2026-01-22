/**
 * TextUtils.js
 * Utilidades para cálculo de texto multilínea y dimensiones intrínsecas
 */

export const TextUtils = {
    /**
     * Calcula las dimensiones necesarias para un texto multilínea
     * @param {CanvasRenderingContext2D} ctx - Contexto para measureText
     * @param {string} text - Contenido
     * @param {number} maxWidth - Ancho máximo permitido
     * @param {number} fontSize - Tamaño de fuente
     * @param {string} fontFamily - Familia (ej: "Fira Code", monospace)
     * @returns {Object} {w, h, lines}
     */
    calculateTextSize(ctx, text, maxWidth, fontSize, fontFamily) {
        ctx.save();
        ctx.font = `${fontSize}px ${fontFamily}`;

        const words = (text || '').split(' ');
        let lines = [];
        let currentLine = '';
        let maxLineWidth = 0;

        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        });
        lines.push(currentLine);

        // Encontrar el ancho real más largo de las líneas generadas
        lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxLineWidth) maxLineWidth = w;
        });

        const lineHeight = fontSize + 5;
        const totalHeight = lines.length * lineHeight;

        ctx.restore();

        return {
            w: maxLineWidth,
            h: totalHeight,
            lineCount: lines.length
        };
    }
};
