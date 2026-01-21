import { GridRenderer } from './renderers/GridRenderer.js';
import { ContainerRenderer } from './renderers/ContainerRenderer.js';
import { NodeRenderer } from './renderers/NodeRenderer.js';
import { ConnectionRenderer } from './renderers/ConnectionRenderer.js';
import { UIRenderer } from './renderers/UIRenderer.js';

export const DesignerCanvas = {
    ctx: null,
    renderers: [],

    init(ctx) {
        this.ctx = ctx;
        this.renderers = [
            GridRenderer,
            ContainerRenderer,
            NodeRenderer,
            ConnectionRenderer,
            UIRenderer
        ];
    },

    /**
     * Main render method using composite renderer pattern
     */
    render(width, height, nodes, navState, connections, activeConnectionId) {
        // Render using all registered renderers in order
        this.renderers.forEach(renderer => {
            if (renderer === GridRenderer) {
                renderer.render(this.ctx, width, height, navState);
            } else if (renderer === ConnectionRenderer) {
                renderer.render(this.ctx, nodes, navState, connections);
            } else if (renderer === NodeRenderer) {
                renderer.render(this.ctx, nodes, navState, activeConnectionId);
            } else {
                renderer.render(this.ctx, nodes, navState);
            }
        });
    },

    // Compatibility wrappers for legacy API
    drawGrid(width, height, navState) {
        GridRenderer.render(this.ctx, width, height, navState);
    },

    drawNodes(nodes, navState, activeConnectionId = null) {
        ContainerRenderer.render(this.ctx, nodes, navState);
        NodeRenderer.render(this.ctx, nodes, navState, activeConnectionId);
    },

    drawUI(nodes, navState) {
        UIRenderer.render(this.ctx, nodes, navState);
    },

    /**
     * Calculate dynamic node radius based on zoom to maintain visual presence
     */
    getNodeRadius(node, zoomScale = 1) {
        const baseRadius = node.isSatellite ? 25 : 35;
        // Compensate partially for zoom: radius grows in world space as zoom decreases
        // At zoom 1.0 -> comp 1.0
        // At zoom 0.5 -> comp ~1.3
        // At zoom 0.2 -> comp ~1.9
        const comp = Math.pow(1 / zoomScale, 0.4);
        return baseRadius * Math.min(2.5, comp);
    },


    /**
     * Calculate the edge point of a node (circle or rectangle) towards a target
     */
    getEdgePoint(node, targetX, targetY, nodes, navState) {
        const angle = Math.atan2(targetY - node.y, targetX - node.x);

        if (node.isRepoContainer) {
            // For rectangles, calculate intersection with border
            const bounds = this.getContainerBounds(node, nodes);
            const w = bounds.w / 2;
            const h = bounds.h / 2;

            // Calculate intersection with rectangle edges
            const tanAngle = Math.tan(angle);
            let edgeX, edgeY;

            // Check intersection with vertical edges (left/right)
            if (Math.abs(Math.cos(angle)) > 0.001) {
                const xSign = Math.cos(angle) > 0 ? 1 : -1;
                edgeX = node.x + w * xSign;
                edgeY = node.y + w * xSign * tanAngle;

                // Check if this point is within the horizontal bounds
                if (Math.abs(edgeY - node.y) <= h) {
                    return { x: edgeX, y: edgeY };
                }
            }

            // Otherwise intersect with horizontal edges (top/bottom)
            const ySign = Math.sin(angle) > 0 ? 1 : -1;
            edgeY = node.y + h * ySign;
            edgeX = node.x + h * ySign / tanAngle;
            return { x: edgeX, y: edgeY };
        } else {
            // For circles, use dynamic radius
            const zoomScale = navState?.zoomScale || 1;
            const radius = this.getNodeRadius(node, zoomScale);
            return {
                x: node.x + radius * Math.cos(angle),
                y: node.y + radius * Math.sin(angle)
            };
        }
    },

    /**
     * Draw a persistent manual connection between two nodes
     */
    drawSimpleLine(fromNode, toNode, navState, nodes) {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(navState.panOffset.x, navState.panOffset.y);
        ctx.scale(navState.zoomScale, navState.zoomScale);

        // Get edge points for both nodes (handles circles and rectangles)
        const startPoint = this.getEdgePoint(fromNode, toNode.x, toNode.y, nodes, navState);
        const endPoint = this.getEdgePoint(toNode, fromNode.x, fromNode.y, nodes, navState);

        const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

        ctx.beginPath();
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.9;

        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();

        // Arrow head
        const headlen = 10;
        ctx.beginPath();
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(endPoint.x - headlen * Math.cos(angle - Math.PI / 6), endPoint.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endPoint.x - headlen * Math.cos(angle + Math.PI / 6), endPoint.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = '#58a6ff';
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw the "ghost" line while the user is actively drawing a connection
     */
    drawActiveLine(fromNode, mouseWorldPos, navState) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(navState.panOffset.x, navState.panOffset.y);
        ctx.scale(navState.zoomScale, navState.zoomScale);

        const angle = Math.atan2(mouseWorldPos.y - fromNode.y, mouseWorldPos.x - fromNode.x);
        const fromRadius = fromNode.isSatellite ? 25 : 35;
        const startX = fromNode.x + fromRadius * Math.cos(angle);
        const startY = fromNode.y + fromRadius * Math.sin(angle);

        ctx.beginPath();
        ctx.strokeStyle = '#2f81f7';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(startX, startY);
        ctx.lineTo(mouseWorldPos.x, mouseWorldPos.y);
        ctx.stroke();

        ctx.restore();
    },

    // Unified logic to calculate container dimensions based on children
    // Now with smooth animation support
    getContainerBounds(node, nodes, zoomScale = 1.0) {
        const containerId = node.id;
        const isScaleUp = node.isDropTarget;
        // Tuned scale factor: 1.10 is subtler than 1.15 (~3-5px less in typical view)
        const scaleFactor = isScaleUp ? 1.10 : 1.0;

        // MANUAL MODE: If user has resized manually, use those dimensions
        if (node.manualWidth && node.manualHeight) {
            return {
                w: node.manualWidth * scaleFactor,
                h: node.manualHeight * scaleFactor,
                centerX: node.x,
                centerY: node.y
            };
        }

        const children = Object.values(nodes).filter(n => n.parentId === containerId);

        // Calculate TARGET dimensions based on children
        let targetW, targetH, targetCenterX, targetCenterY;

        if (children.length === 0) {
            targetW = 140;
            targetH = 100;
            targetCenterX = node.x;
            targetCenterY = node.y;
        } else {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            children.forEach(c => {
                const r = this.getNodeRadius(c, zoomScale);
                const labelStr = c.label || "";
                const estimatedPixelWidth = labelStr.length * 13;
                const worldLabelWidth = estimatedPixelWidth / zoomScale;
                const effectiveHalfWidth = Math.max(r, worldLabelWidth / 2 + 10);

                minX = Math.min(minX, c.x - effectiveHalfWidth);
                maxX = Math.max(maxX, c.x + effectiveHalfWidth);
                minY = Math.min(minY, c.y - r);
                maxY = Math.max(maxY, c.y + r);
            });

            const padding = 60;
            const hPadding = 60;
            targetW = (maxX - minX) + padding;
            targetH = (maxY - minY) + hPadding + 40;
            targetCenterX = (minX + maxX) / 2;
            targetCenterY = (minY + maxY) / 2;
        }

        // SMOOTH ANIMATION: Interpolate current size towards target
        const easing = 0.15; // Lower = slower, smoother transition

        // Store targets for animation loop detection
        node._targetW = targetW;
        node._targetH = targetH;

        // Initialize animated properties if not present
        if (node._animW === undefined) node._animW = targetW;
        if (node._animH === undefined) node._animH = targetH;

        // Interpolate towards target
        node._animW += (targetW - node._animW) * easing;
        node._animH += (targetH - node._animH) * easing;

        // Snap to target if close enough (prevent endless micro-animations)
        if (Math.abs(targetW - node._animW) < 0.5) node._animW = targetW;
        if (Math.abs(targetH - node._animH) < 0.5) node._animH = targetH;

        return {
            w: node._animW * scaleFactor,
            h: node._animH * scaleFactor,
            centerX: targetCenterX,
            centerY: targetCenterY
        };
    },


};
