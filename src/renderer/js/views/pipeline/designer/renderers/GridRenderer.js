/**
 * GridRenderer.js
 * Responsabilidad: Renderizado de la cuadrícula de fondo
 */

export const GridRenderer = {
    /**
     * Draw the background grid
     */
    render(ctx, width, height, camera) {
        // PERF: clearRect removed - already done in DesignerController
        camera.apply(ctx);
        ctx.strokeStyle = 'rgba(48, 54, 61, 0.4)';
        ctx.lineWidth = 1 / camera.zoomScale;
        const size = 100;
        const startX = -Math.floor(camera.panOffset.x / camera.zoomScale / size) * size - size * 10;
        const endX = startX + (width / camera.zoomScale) + size * 20;
        const startY = -Math.floor(camera.panOffset.y / camera.zoomScale / size) * size - size * 10;
        const endY = startY + (height / camera.zoomScale) + size * 20;
        for (let x = startX; x <= endX; x += size) {
            ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
        }
        for (let y = startY; y <= endY; y += size) {
            ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
        }
        camera.restore(ctx);
    }
};
