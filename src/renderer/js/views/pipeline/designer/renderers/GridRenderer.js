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
        const buffer = gridGeom.buffer * size;
        const zoom = camera.zoomScale;
        const pan = camera.panOffset;

        // Get world-space viewport locally to avoid circular dependency with DesignerCanvas
        const startX_world = (-pan.x / zoom) - buffer;
        const endX_world = ((width - pan.x) / zoom) + buffer;
        const startY_world = (-pan.y / zoom) - buffer;
        const endY_world = ((height - pan.y) / zoom) + buffer;

        const startX = Math.floor(startX_world / size) * size;
        const endX = Math.ceil(endX_world / size) * size;
        const startY = Math.floor(startY_world / size) * size;
        const endY = Math.ceil(endY_world / size) * size;
        for (let x = startX; x <= endX; x += size) {
            ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
        }
        for (let y = startY; y <= endY; y += size) {
            ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
        }
        camera.restore(ctx);
    }
};
