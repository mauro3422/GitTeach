import { PIPELINE_NODES } from './PipelineConstants.js';

export const ConnectionRouter = {
    // Current route cache
    routes: {},

    // Route Theme Mapping
    ROUTE_THEMES: {
        'DATA_INGESTION': '#8b949e',
        'WORKER_FLOW': '#3fb950',
        'DATA_FLOW': '#2f81f7',
        'HEAVY_PROCESS': '#f1e05a',
        'STORAGE': '#388bfd',
        'SYNTHESIS': '#bc8cff',
        'FEEDBACK_LOOP': '#6e7681', // More subtle for control signals
        'MAINTENANCE': '#da3633',
        'DEFAULT': 'rgba(139, 148, 158, 0.15)'
    },

    hash(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= h ^ str.charCodeAt(i);
            h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
        }
        return h >>> 0;
    },

    /**
     * PCB Routing Engine v5.3.1 (Atomic Straight Lines + Slot Pinning)
     */
    computeRoute(fromId, toId, startPos, endPos, type = 'DATA_FLOW', allPositions = {}) {
        const routeId = `${fromId}_${toId}`;
        const h = this.hash(routeId);

        // 1. PIN CALCULATION (Smart Side & Slot Allocation)
        const fromRadius = (PIPELINE_NODES[fromId]?.isSatellite ? 25 : 45);
        const toRadius = (PIPELINE_NODES[toId]?.isSatellite ? 25 : 45);

        // Horizontal/Vertical spread to separate pins (PCB Lanes)
        const laneOffset = (h % 23 - 11) * 4;
        const pinOff = (h % 9 - 4) * 5;

        // DETECT ALIGNMENT (Threshold 20px)
        const isAlignedH = Math.abs(startPos.y - endPos.y) < 20;
        const isAlignedV = Math.abs(startPos.x - endPos.x) < 20;

        let sourcePin, targetPin;
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;

        // FORCE ALIGNMENT IF CLOSE
        if (isAlignedH) {
            // Horizontal Straight Line: Pin exactly on same Y
            const side = dx > 0 ? 1 : -1;
            sourcePin = { x: startPos.x + (side * fromRadius), y: startPos.y + pinOff };
            targetPin = { x: endPos.x - (side * toRadius), y: startPos.y + pinOff }; // Sync Y to source pin!
        } else if (isAlignedV) {
            // Vertical Straight Line: Pin exactly on same X
            const side = dy > 0 ? 1 : -1;
            sourcePin = { x: startPos.x + pinOff, y: startPos.y + (side * fromRadius) };
            targetPin = { x: startPos.x + pinOff, y: endPos.y - (side * toRadius) }; // Sync X to source pin!
        } else {
            // Diagonal -> Choose best face
            if (Math.abs(dx) > Math.abs(dy)) {
                const side = dx > 0 ? 1 : -1;
                sourcePin = { x: startPos.x + (side * fromRadius), y: startPos.y + pinOff };
                targetPin = { x: endPos.x - (side * toRadius), y: endPos.y + pinOff };
            } else {
                const side = dy > 0 ? 1 : -1;
                sourcePin = { x: startPos.x + pinOff, y: startPos.y + (side * fromRadius) };
                targetPin = { x: endPos.x + pinOff, y: endPos.y - (side * toRadius) };
            }
        }

        // --- CASCADING ROUTE LOGIC ---

        // STEP 1: PURE DIRECT (No turns)
        // If aligned and no major nodes block the direct path
        const directPath = [startPos, sourcePin, targetPin, endPos];
        if ((isAlignedH || isAlignedV) && !this.checkCleanliness(directPath, [fromId, toId], allPositions)) {
            this.routes[routeId] = directPath;
            return directPath;
        }

        // STEP 2: SIMPLE MANHATTAN (L-Shape)
        const l1 = [startPos, sourcePin, { x: targetPin.x, y: sourcePin.y }, targetPin, endPos];
        const l2 = [startPos, sourcePin, { x: sourcePin.x, y: targetPin.y }, targetPin, endPos];

        if (!this.checkCleanliness(l1, [fromId, toId], allPositions)) {
            this.routes[routeId] = l1; return l1;
        }
        if (!this.checkCleanliness(l2, [fromId, toId], allPositions)) {
            this.routes[routeId] = l2; return l2;
        }

        // STEP 3: HIGHWAY TUNNELING (Z-Shape)
        // Special zones for feedback or long distance
        const isFeedback = type === 'FEEDBACK_LOOP' || dx < -100;
        const zones = isFeedback ? [1850, 2200, 300] : [450, 780, 1100, 1450, 1700];
        const midY = (sourcePin.y + targetPin.y) / 2;
        zones.sort((a, b) => Math.abs(a - midY) - Math.abs(b - midY));

        for (const hy of zones) {
            const testY = hy + laneOffset;
            const hPath = [
                startPos, sourcePin,
                { x: sourcePin.x + (dx > 0 ? 30 : -30), y: sourcePin.y }, // Short lead
                { x: sourcePin.x + (dx > 0 ? 30 : -30), y: testY },
                { x: targetPin.x - (dx > 0 ? 30 : -30), y: testY },
                { x: targetPin.x - (dx > 0 ? 30 : -30), y: targetPin.y },
                targetPin, endPos
            ];

            if (!this.checkCleanliness(hPath, [fromId, toId], allPositions)) {
                this.routes[routeId] = hPath;
                return hPath;
            }
        }

        // FALLBACK: Simple L-shape
        this.routes[routeId] = l1;
        return l1;
    },

    checkCleanliness(path, ignoreIds, allPositions) {
        for (let i = 1; i < path.length - 2; i++) {
            const p1 = path[i], p2 = path[i + 1];
            if (Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y) < 2) continue;

            for (const id in allPositions) {
                if (ignoreIds.includes(id)) continue;
                const node = allPositions[id];
                const config = PIPELINE_NODES[id];
                if (config?.isSatellite && ignoreIds.includes(config.orbitParent)) continue;

                // STRICT PADDING: Keep cables away from node drawings
                const pad = config?.internalClasses?.length > 0 ? 115 : (config?.isSatellite ? 55 : 85);
                if (this.intersects(node, p1, p2, pad)) return true;
            }
        }
        return false;
    },

    intersects(node, p1, p2, r) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return false;
        let t = Math.max(0, Math.min(1, ((node.x - p1.x) * dx + (node.y - p1.y) * dy) / lenSq));
        const dSq = (p1.x + t * dx - node.x) ** 2 + (p1.y + t * dy - node.y) ** 2;
        return dSq < (r * r);
    },

    drawPath(ctx, path, type = 'DEFAULT', isMoving = false, isDispatching = false, isReceiving = false) {
        if (!path || path.length < 3) return;
        const color = this.ROUTE_THEMES[type] || this.ROUTE_THEMES.DEFAULT;
        const radius = 10;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (isDispatching || isReceiving) {
            ctx.setLineDash([12, 10]);
            ctx.lineDashOffset = (isDispatching ? 1 : -1) * (Date.now() / 15) % 22;
            ctx.lineWidth = 2.4;
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 8;
            ctx.shadowColor = color;
        } else {
            ctx.globalAlpha = 0.5;
        }

        // START AT PIN (index 1), END AT PIN (length-2)
        ctx.moveTo(path[1].x, path[1].y);
        for (let i = 2; i < path.length - 1; i++) {
            ctx.arcTo(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y, radius);
        }
        ctx.lineTo(path[path.length - 2].x, path[path.length - 2].y);
        ctx.stroke();

        // Pin Vias for active flow
        if (isDispatching || isReceiving) {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(path[1].x, path[1].y, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(path[path.length - 2].x, path[path.length - 2].y, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    },

    getPointOnPath(path, percent) {
        if (!path || path.length < 2) return { x: 0, y: 0 };
        const total = path.length - 1;
        const idx = Math.min(Math.floor(percent * total), total - 1);
        const sub = (percent * total) - idx;
        return {
            x: path[idx].x + (path[idx + 1].x - path[idx].x) * sub,
            y: path[idx].y + (path[idx + 1].y - path[idx].y) * sub
        };
    }
};
