import { GridRenderer } from './renderers/GridRenderer.js';
import { ContainerRenderer } from './renderers/ContainerRenderer.js';
import { NodeRenderer } from './renderers/NodeRenderer.js';
import { ConnectionRenderer } from './renderers/ConnectionRenderer.js';
import { UIRenderer } from './renderers/UIRenderer.js';
import { CanvasCamera } from '../../../core/CanvasCamera.js';
import { ThemeManager } from '../../../core/ThemeManager.js';
import { GeometryUtils } from './GeometryUtils.js';

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
     * Proxy to GeometryUtils
     */
    getNodeRadius(node, zoomScale = 1) {
        return GeometryUtils.getNodeRadius(node, zoomScale);
    },


    /**
     * Calculate the edge point of a node (circle or rectangle) towards a target
     * Proxy to GeometryUtils
     */
    getEdgePoint(node, targetX, targetY, nodes, camera) {
        return GeometryUtils.getEdgePoint(node, targetX, targetY, nodes, camera);
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
        return GeometryUtils.getContainerBounds(node, nodes, zoomScale, dropTargetId);
    },


};
