import { ThemeManager } from '../../../../core/ThemeManager.js';

export const GridRenderer = {
    /**
     * Draw the background grid
     */
    render(ctx, width, height, camera) {
        // PERF: clearRect removed - already done in DesignerController
        camera.apply(ctx);
        ctx.strokeStyle = ThemeManager.colors.gridLine;
        ctx.lineWidth = 1 / camera.zoomScale;
        const gridGeom = ThemeManager.geometry.grid;
        const size = gridGeom.size;
        const startX = -Math.floor(camera.panOffset.x / camera.zoomScale / size) * size - size * gridGeom.buffer;
        const endX = startX + (width / camera.zoomScale) + size * (gridGeom.buffer * 2);
        const startY = -Math.floor(camera.panOffset.y / camera.zoomScale / size) * size - size * gridGeom.buffer;
        const endY = startY + (height / camera.zoomScale) + size * (gridGeom.buffer * 2);
        for (let x = startX; x <= endX; x += size) {
            ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
        }
        for (let y = startY; y <= endY; y += size) {
            ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
        }
        camera.restore(ctx);
    }
};
