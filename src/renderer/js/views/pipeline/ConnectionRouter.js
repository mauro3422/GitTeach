/**
 * ConnectionRouter.js
 * Specialized engine for computing "Highway" routes between nodes.
 * Uses Manhattan routing (ortho) to ensure clean, structured connections.
 */

export const ConnectionRouter = {
    // Current route cache { from_to: [{x, y}, ...] }
    routes: {},

    LANE_OFFSET: 15, // Gap between parallel connections

    /**
     * Compute a Manhattan path between two points
     */
    computeRoute(fromId, toId, startPos, endPos, connections) {
        const routeId = `${fromId}_${toId}`;

        // Logical flow: usually Left-to-Right
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;

        // Base points
        const points = [startPos];

        // 1. Create a "Highway" bend
        // If they are mostly horizontal, create one vertical bend in the middle
        if (Math.abs(dx) > Math.abs(dy)) {
            const midX = startPos.x + dx / 2;
            points.push({ x: midX, y: startPos.y });
            points.push({ x: midX, y: endPos.y });
        } else {
            // Mostly vertical (e.g., workers to buffer)
            const midY = startPos.y + dy / 2;
            points.push({ x: startPos.x, y: midY });
            points.push({ x: endPos.x, y: midY });
        }

        points.push(endPos);

        this.routes[routeId] = points;
        return points;
    },

    /**
     * Draw the routed path
     */
    drawPath(ctx, path, color, isMoving = false, isDispatching = false, isReceiving = false) {
        if (!path || path.length < 2) return;

        ctx.save();

        // Base line style
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        if (isDispatching) {
            ctx.setLineDash([10, 5]);
            ctx.lineDashOffset = (Date.now() / 30) % 15;
            ctx.strokeStyle = '#388bfd'; // Soft blue for dispatch
        } else if (isReceiving) {
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = -(Date.now() / 20) % 10;
            ctx.strokeStyle = '#3fb950'; // Vibrant green for receive
        } else {
            ctx.setLineDash([]);
        }

        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();

        // High gloss tips
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(path[0].x, path[0].y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Get a point along the routed path (for traveling packages)
     * percent: 0.0 to 1.0
     */
    getPointOnPath(path, percent) {
        if (!path || path.length < 2) return { x: 0, y: 0 };

        const totalSegments = path.length - 1;
        const segmentIndex = Math.min(Math.floor(percent * totalSegments), totalSegments - 1);
        const segmentPercent = (percent * totalSegments) - segmentIndex;

        const p1 = path[segmentIndex];
        const p2 = path[segmentIndex + 1];

        return {
            x: p1.x + (p2.x - p1.x) * segmentPercent,
            y: p1.y + (p2.y - p1.y) * segmentPercent
        };
    }
};
