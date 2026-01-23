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
    render(width, height, nodes, navState, connections, activeConnectionId, activeConnection = null, hoveredNodeId = null, dropTargetId = null, resizingNodeId = null, selectedNodeId = null, selectedConnectionId = null) {
        // Sincronizar camera con navState (temporal para compatibilidad)
        this.camera.pan = navState.panOffset;
        this.camera.zoom = navState.zoomScale;

        // 1. Grid Renderer (Handles its own space/tiling)
        GridRenderer.render(this.ctx, width, height, this.camera);

        // 2. World Space Renderers (Apply camera transform once)
        this.camera.apply(this.ctx);

        ContainerRenderer.render(this.ctx, nodes, this.camera, hoveredNodeId, dropTargetId, resizingNodeId, selectedNodeId);
        NodeRenderer.render(this.ctx, nodes, this.camera, activeConnectionId, hoveredNodeId, selectedNodeId);
        // ConnectionRenderer now handles both persistent and active connections
        ConnectionRenderer.render(this.ctx, nodes, this.camera, connections, activeConnection, selectedConnectionId);

        this.camera.restore(this.ctx);

        // EXTRA SAFETY: Ensure context is clean before UI
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;

        UIRenderer.render(this.ctx, nodes, this.camera, hoveredNodeId, dropTargetId, selectedNodeId);
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

    // Unified logic to calculate container dimensions based on children
    // Now using the unified dimensions schema (Issue #6)
    getContainerBounds(node, nodes, zoomScale = 1.0, dropTargetId = null) {
        return GeometryUtils.getContainerBounds(node, nodes, zoomScale, dropTargetId);
    },


};
