/**
 * GridRenderer.js
 * Responsabilidad: Renderizado de la cuadrícula de fondo
 */

export const GridRenderer = {
    /**
     * Draw the background grid
     */
    render(ctx, width, height, navState) {
        const { panOffset, zoomScale } = navState;
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoomScale, zoomScale);
        ctx.strokeStyle = 'rgba(48, 54, 61, 0.4)';
        ctx.lineWidth = 1 / zoomScale;
        const size = 100;
        const startX = -Math.floor(panOffset.x / zoomScale / size) * size - size * 10;
        const endX = startX + (width / zoomScale) + size * 20;
        const startY = -Math.floor(panOffset.y / zoomScale / size) * size - size * 10;
        const endY = startY + (height / zoomScale) + size * 20;
        for (let x = startX; x <= endX; x += size) {
            ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
        }
        for (let y = startY; y <= endY; y += size) {
            ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
        }
        ctx.restore();
    }
};
