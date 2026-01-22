import { GridRenderer } from './renderers/GridRenderer.js';
import { ContainerRenderer } from './renderers/ContainerRenderer.js';
import { NodeRenderer } from './renderers/NodeRenderer.js';
import { ConnectionRenderer } from './renderers/ConnectionRenderer.js';
import { UIRenderer } from './renderers/UIRenderer.js';
import { CanvasCamera } from '../../../core/CanvasCamera.js';
import { ThemeManager } from '../../../core/ThemeManager.js';

export const DesignerCanvas = {
    ctx: null,
    renderers: [],
    camera: new CanvasCamera(), // Nueva instancia de camera

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
    render(width, height, nodes, navState, connections, activeConnectionId, activeConnection = null, hoveredNodeId = null, dropTargetId = null) {
        // Sincronizar camera con navState (temporal para compatibilidad)
        this.camera.pan = navState.panOffset;
        this.camera.zoom = navState.zoomScale;

        // 1. Grid Renderer (Handles its own space/tiling)
        GridRenderer.render(this.ctx, width, height, this.camera);

        // 2. World Space Renderers (Apply camera transform once)
        this.camera.apply(this.ctx);

        ContainerRenderer.render(this.ctx, nodes, this.camera, hoveredNodeId, dropTargetId);
        NodeRenderer.render(this.ctx, nodes, this.camera, activeConnectionId, hoveredNodeId);
        ConnectionRenderer.render(this.ctx, nodes, this.camera, connections);

        // 2.1 Active ghost line (part of world-space)
        if (activeConnection) {
            this.drawActiveLine(activeConnection.fromNode, activeConnection.currentPos, this.camera);
        }

        this.camera.restore(this.ctx);

        // EXTRA SAFETY: Ensure context is clean before UI
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;

        UIRenderer.render(this.ctx, nodes, this.camera, hoveredNodeId, dropTargetId);
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
    getEdgePoint(node, targetX, targetY, nodes, camera) {
        const angle = Math.atan2(targetY - node.y, targetX - node.x);
        const isRectangular = node.isRepoContainer || node.isStickyNote;

        if (isRectangular) {
            // For rectangles, calculate intersection with border
            const bounds = node.isRepoContainer
                ? this.getContainerBounds(node, nodes, camera.zoomScale)
                : {
                    w: node.dimensions?.animW || node.dimensions?.w || 180,
                    h: node.dimensions?.animH || node.dimensions?.h || 100
                };

            const w = bounds.w / 2;
            const h = bounds.h / 2;
            const centerX = bounds.centerX || node.x;
            const centerY = bounds.centerY || node.y;

            // Calculate intersection with rectangle edges
            const tanAngle = Math.tan(angle);
            let edgeX, edgeY;

            // Check intersection with vertical edges (left/right)
            if (Math.abs(Math.cos(angle)) > 0.001) {
                const xSign = Math.cos(angle) > 0 ? 1 : -1;
                edgeX = centerX + w * xSign;
                edgeY = centerY + w * xSign * tanAngle;

                // Check if this point is within the horizontal bounds
                if (Math.abs(edgeY - centerY) <= h) {
                    return { x: edgeX, y: edgeY };
                }
            }

            // Otherwise intersect with horizontal edges (top/bottom)
            const ySign = Math.sin(angle) > 0 ? 1 : -1;
            edgeY = centerY + h * ySign;
            edgeX = centerX + h * ySign / tanAngle;
            return { x: edgeX, y: edgeY };
        } else {
            // For circles, use dynamic radius
            const zoomScale = camera.zoomScale;
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
    drawSimpleLine(fromNode, toNode, camera, nodes) {
        const ctx = this.ctx;
        ctx.save(); // CRITICAL: Isolate state changes

        // Get edge points for both nodes (handles circles and rectangles)
        const startPoint = this.getEdgePoint(fromNode, toNode.x, toNode.y, nodes, camera);
        const endPoint = this.getEdgePoint(toNode, fromNode.x, fromNode.y, nodes, camera);

        const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

        ctx.beginPath();
        ctx.strokeStyle = ThemeManager.colors.connection;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.9;

        // Neon Glow for connections
        ctx.shadowBlur = 8;
        ctx.shadowColor = ThemeManager.colors.connection;

        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();

        // Arrow head
        const headlen = 10;
        ctx.beginPath(); // New path for arrow
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(endPoint.x - headlen * Math.cos(angle - Math.PI / 6), endPoint.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endPoint.x - headlen * Math.cos(angle + Math.PI / 6), endPoint.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = ThemeManager.colors.connection;
        ctx.fill();

        ctx.restore(); // CRITICAL
    },

    /**
     * Draw the "ghost" line while the user is actively drawing a connection
     */
    drawActiveLine(fromNode, mouseWorldPos, camera) {
        const ctx = this.ctx;
        ctx.save();

        const angle = Math.atan2(mouseWorldPos.y - fromNode.y, mouseWorldPos.x - fromNode.x);
        const fromRadius = fromNode.isSatellite ? 25 : 35;
        const startX = fromNode.x + fromRadius * Math.cos(angle);
        const startY = fromNode.y + fromRadius * Math.sin(angle);

        ctx.beginPath();
        ctx.strokeStyle = ThemeManager.colors.primary;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.7;

        ctx.moveTo(startX, startY);
        ctx.lineTo(mouseWorldPos.x, mouseWorldPos.y);
        ctx.stroke();

        ctx.restore();
    },

    // Unified logic to calculate container dimensions based on children
    // Now using the unified dimensions schema (Issue #6)
    getContainerBounds(node, nodes, zoomScale = 1.0, dropTargetId = null) {
        const containerId = node.id;
        const isScaleUp = node.id === dropTargetId;
        const scaleFactor = isScaleUp ? 1.10 : 1.0;

        // Initialize dimensions if missing (legacy recovery)
        if (!node.dimensions) {
            node.dimensions = {
                w: 180, h: 100, animW: 180, animH: 100, targetW: 180, targetH: 100, isManual: false
            };
        }
        const dims = node.dimensions;

        // MANUAL MODE: Use user-provided dimensions
        if (dims.isManual) {
            return {
                w: dims.w * scaleFactor,
                h: dims.h * scaleFactor,
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

            // Base padding increases slightly with more children to give "breathing room"
            const basePadding = 60 + Math.min(children.length * 5, 40);
            const hPadding = basePadding;

            targetW = (maxX - minX) + basePadding;
            targetH = (maxY - minY) + hPadding + 40;
            targetCenterX = (minX + maxX) / 2;
            targetCenterY = (minY + maxY) / 2;
        }

        // ELASTIC TRANSITION LOGIC
        // If the number of children changed, trigger an expansion pulse
        if (dims._lastChildCount !== undefined && children.length > dims._lastChildCount) {
            dims.transitionPadding = 50; // Extra temporary padding to "pop" open
            console.log(`[Animation] 🚀 Container ${node.id} expanding for new node.`);
        }
        dims._lastChildCount = children.length;
        dims.transitionPadding = dims.transitionPadding || 0;

        // Apply transition padding to target (elastic effect)
        targetW += dims.transitionPadding;
        targetH += dims.transitionPadding;

        // SMOOTH ANIMATION: Interpolate current size towards target
        const easing = 0.15;

        // Decay transition padding smoothly back to 0
        dims.transitionPadding *= 0.85;
        if (dims.transitionPadding < 0.1) dims.transitionPadding = 0;

        dims.targetW = targetW;
        dims.targetH = targetH;

        // Interpolate anim properties
        dims.animW += (targetW - dims.animW) * easing;
        dims.animH += (targetH - dims.animH) * easing;

        // Snap to target if close enough
        if (Math.abs(targetW - dims.animW) < 0.5) dims.animW = targetW;
        if (Math.abs(targetH - dims.animH) < 0.5) dims.animH = targetH;

        return {
            w: dims.animW * scaleFactor,
            h: dims.animH * scaleFactor,
            centerX: targetCenterX,
            centerY: targetCenterY
        };
    },


};
