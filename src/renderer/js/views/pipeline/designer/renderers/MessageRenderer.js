/**
 * MessageRenderer.js
 * Sistema unificado para renderizado de mensajes y notificaciones
 * Centraliza badges, indicadores y elementos de comunicación visual
 */

import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';

export const MessageRenderer = {
    /**
     * Dibuja badge de notificación sobre un nodo
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} node - Nodo que tiene el mensaje
     * @param {number} zoomScale - Escala actual de zoom
     * @param {Object} style - Configuración visual
     */
    drawMessageBadge(ctx, node, zoomScale, style = {}) {
        if (!node.message || node.message.trim() === '') return;

        const {
            badgeColor = ThemeManager.colors.error,
            icon = '✎',
            size = 16
        } = style;

        // Calcular posición del badge
        const radius = node.isRepoContainer ?
            (node.dimensions?.animW || 180) / 2 :
            (node.isSatellite ? 25 : 35);

        const scaledRadius = radius * zoomScale;
        const scaledSize = size / zoomScale;

        // Posición: esquina superior derecha del nodo
        const x = node.x + scaledRadius * 0.7;
        const y = node.y - scaledRadius * 0.7;

        // Dibujar badge usando CanvasPrimitives
        CanvasPrimitives.drawBadge(ctx, icon, x, y, badgeColor, scaledSize);
    },

    /**
     * Dibuja indicador sutil de "tiene mensaje" (sin icono)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x, y - Posición
     * @param {boolean} hasMessage - Si hay mensaje
     * @param {Object} style - Configuración
     */
    drawMessageIndicator(ctx, x, y, hasMessage, style = {}) {
        if (!hasMessage) return;

        const {
            color = ThemeManager.colors.error,
            size = 8
        } = style;

        ctx.save();

        // Dibujar punto rojo sutil
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Borde sutil
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Dibuja burbuja de chat en el canvas (para futura expansión)
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text - Contenido de la burbuja
     * @param {number} x, y - Posición del puntero
     * @param {Object} style - Configuración
     */
    drawChatBubble(ctx, text, x, y, style = {}) {
        const {
            bgColor = 'rgba(255, 255, 255, 0.95)',
            borderColor = '#30363d',
            textColor = ThemeManager.colors.text,
            maxWidth = 200,
            padding = 10,
            borderRadius = 8,
            fontSize = 14
        } = style;

        ctx.save();

        // Calcular dimensiones de la burbuja
        ctx.font = `${fontSize}px ${ThemeManager.fontFamily || 'monospace'}`;
        const lines = this._calculateLines(ctx, text, maxWidth - padding * 2);
        const bubbleWidth = maxWidth;
        const bubbleHeight = lines.length * (fontSize + 4) + padding * 2;

        // Posicionar burbuja
        let bubbleX = x + 20;
        let bubbleY = y - bubbleHeight - 10;

        // Ajustar si sale de pantalla
        const canvas = ctx.canvas;
        if (bubbleX + bubbleWidth > canvas.width) {
            bubbleX = x - bubbleWidth - 20;
        }
        if (bubbleY < 0) bubbleY = y + 20;

        // Dibujar fondo de burbuja
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;

        if (ctx.roundRect) {
            ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, borderRadius);
        } else {
            ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
            ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Dibujar texto
        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        lines.forEach((line, index) => {
            const lineY = bubbleY + padding + index * (fontSize + 4);
            ctx.fillText(line, bubbleX + padding, lineY);
        });

        // Dibujar "punta" de la burbuja
        this._drawBubblePointer(ctx, x, y, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bgColor, borderColor);

        ctx.restore();
    },

    /**
     * Dibuja contador numérico de mensajes
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} count - Número de mensajes
     * @param {number} x, y - Posición
     * @param {Object} style - Configuración
     */
    drawMessageCount(ctx, count, x, y, style = {}) {
        if (count <= 0) return;

        const {
            bgColor = ThemeManager.colors.error,
            textColor = '#ffffff',
            size = 18
        } = style;

        ctx.save();

        // Fondo circular
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Borde
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Texto del contador
        ctx.fillStyle = textColor;
        ctx.font = `bold ${size * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const displayText = count > 99 ? '99+' : count.toString();
        ctx.fillText(displayText, x, y);

        ctx.restore();
    },

    /**
     * Dibuja tooltip de mensaje expandido al hacer hover
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} message - Contenido del mensaje
     * @param {number} x, y - Posición del trigger
     * @param {Object} style - Configuración
     */
    drawMessageTooltip(ctx, message, x, y, style = {}) {
        const {
            title = 'Mensaje',
            maxWidth = 300,
            showTimestamp = false,
            timestamp
        } = style;

        // Usar el tooltip estándar pero con contenido de mensaje
        const fullText = showTimestamp && timestamp ?
            `${title}\n${timestamp}\n\n${message}` :
            `${title}\n\n${message}`;

        // Importar TextRenderer dinámicamente para evitar dependencias circulares
        import('./TextRenderer.js').then(({ TextRenderer }) => {
            TextRenderer.drawTooltip(ctx, fullText, x, y, {
                bgColor: 'rgba(13, 17, 23, 0.98)',
                borderColor: ThemeManager.colors.border || '#30363d',
                textColor: '#e6edf3',
                maxWidth: maxWidth,
                fontSize: 13
            });
        });
    },

    /**
     * Utilidad para calcular líneas de texto (similar a TextRenderer)
     * @private
     */
    _calculateLines(ctx, text, maxWidth) {
        if (!text || text.trim() === '') return [''];

        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine.length > 0) {
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
     * Dibuja la "punta" de la burbuja de chat
     * @private
     */
    _drawBubblePointer(ctx, triggerX, triggerY, bubbleX, bubbleY, bubbleW, bubbleH, bgColor, borderColor) {
        const pointerSize = 8;
        const pointerX = bubbleX + bubbleW / 2;
        const pointerY = triggerY < bubbleY ? bubbleY + bubbleH : bubbleY;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(pointerX, pointerY);
        ctx.lineTo(pointerX - pointerSize / 2, pointerY + (triggerY < bubbleY ? pointerSize : -pointerSize));
        ctx.lineTo(pointerX + pointerSize / 2, pointerY + (triggerY < bubbleY ? pointerSize : -pointerSize));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
};
