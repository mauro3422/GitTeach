import { GridRenderer } from './renderers/GridRenderer.js';
import { ContainerRenderer } from './renderers/ContainerRenderer.js';
import { NodeRenderer } from './renderers/NodeRenderer.js';
import { ConnectionRenderer } from './renderers/ConnectionRenderer.js';
import { UIRenderer } from './renderers/UIRenderer.js';
import { CanvasCamera } from '../../../core/CanvasCamera.js';
import { ThemeManager } from '../../../core/ThemeManager.js';
import { GeometryUtils } from './GeometryUtils.js';
import { cameraState } from './modules/stores/CameraState.js';
import { nodeRepository } from './modules/stores/NodeRepository.js';
import { DESIGNER_CONSTANTS } from './DesignerConstants.js';
// Import LayoutUtils to ensure it's loaded and exported to window (for GeometryUtils fallback)
import { LayoutUtils } from './utils/LayoutUtils.js';

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
     * Issue #17: Calculate viewport bounds in world-space coordinates
     * @returns {Object} { minX, maxX, minY, maxY } in world space
     */
    getViewportBounds(width, height) {
        // Use cameraState directly (Single Source of Truth)
        const cameraVal = cameraState.state;
        const zoom = cameraVal.zoomScale;
        const pan = cameraVal.panOffset;

        // Margin in world space
        const margin = DESIGNER_CONSTANTS.VISUAL.VIEWPORT_MARGIN / zoom;

        // Correct formula: (ScreenPos - Pan) / Zoom
        // Screen(0,0) -> World(minX, minY)
        // Screen(width, height) -> World(maxX, maxY)
        return {
            minX: (-pan.x / zoom) - margin,
            maxX: ((width - pan.x) / zoom) + margin,
            minY: (-pan.y / zoom) - margin,
            maxY: ((height - pan.y) / zoom) + margin
        };
    },

    /**
     * Issue #17: Check if bounds intersect with viewport
     */
    boundsIntersectViewport(bounds, viewport) {
        if (!bounds) return true; // Include if bounds unknown
        const bw = (bounds.renderW || bounds.w || 0) / 2;
        const bh = (bounds.renderH || bounds.h || 0) / 2;
        const bx = bounds.centerX;
        const by = bounds.centerY;

        // AABB collision: if no separation, then intersecting
        return !(
            bx + bw < viewport.minX ||
            bx - bw > viewport.maxX ||
            by + bh < viewport.minY ||
            by - bh > viewport.maxY
        );
    },

    getVisibleNodes(nodes, viewport, zoom) {
        const nodeList = Array.isArray(nodes) ? nodes : Object.values(nodes);
        if (nodeList.length === 0) return [];

        const visible = [];
        for (const node of nodeList) {
            // PERFORMANCE: Use bounds cache from NodeRepository (Fase 3)
            const bounds = nodeRepository.getCachedBounds(node.id, zoom);

            if (this.boundsIntersectViewport(bounds, viewport)) {
                visible.push(node);
            }
        }
        return visible;
    },

    /**
     * Issue #17: Get only visible connections
     * @param {Array} connections - All connections
     * @param {Array} visibleNodeIds - Set of visible node IDs
     * @returns {Array} Only connections between visible nodes
     */
    getVisibleConnections(connections, visibleNodeIds) {
        if (!connections || connections.length === 0) return [];
        const visibleSet = new Set(visibleNodeIds);
        return connections.filter(c => visibleSet.has(c.from) && visibleSet.has(c.to));
    },

    /**
     * Main render method using composite renderer pattern
     */
    render(width, height, nodes, connections, activeConnectionId, activeConnection = null, hoveredNodeId = null, dropTargetId = null, resizingNodeId = null, selectedNodeId = null, selectedConnectionId = null, draggingNodeId = null) {
        // Sync internal camera with cameraState (Single Source of Truth)
        const cameraVal = cameraState.state;
        this.camera.pan = cameraVal.panOffset;
        this.camera.zoom = cameraVal.zoomScale;

        // --- CULLING LOGIC (Issue #17) ---
        const viewport = this.getViewportBounds(width, height);
        const visibleNodes = this.getVisibleNodes(nodes, viewport, this.camera.zoom);
        const visibleNodeIds = visibleNodes.map(n => n.id);
        const visibleConnections = this.getVisibleConnections(connections, visibleNodeIds);

        // 1. Grid Renderer (Handles its own space/tiling)
        GridRenderer.render(this.ctx, width, height, this.camera);

        // 2. World Space Renderers (Apply camera transform once)
        this.camera.apply(this.ctx);

        // Optimization: Pass visibleNodeIds set to avoid O(N) loops in sub-renderers
        const visibleNodeIdsSet = new Set(visibleNodeIds);

        // ContainerRenderer needs full nodes list for auto-growth calculations, but we pass visibility set
        ContainerRenderer.render(this.ctx, nodes, this.camera, visibleNodeIdsSet, hoveredNodeId, dropTargetId, resizingNodeId, selectedNodeId);

        // NodeRenderer only processes visible nodes (O(visible) complexity now)
        NodeRenderer.render(this.ctx, visibleNodes, this.camera, activeConnectionId, hoveredNodeId, selectedNodeId);

        // ConnectionRenderer handles persistent connections
        ConnectionRenderer.render(this.ctx, nodes, this.camera, visibleConnections, activeConnection, selectedConnectionId);

        // Render resize handles in world space (before camera restore)
        if (selectedNodeId && nodes[selectedNodeId]) {
            const selectedNode = nodes[selectedNodeId];
            if (selectedNode.isRepoContainer || selectedNode.isStickyNote) {
                UIRenderer.renderResizeHandles(this.ctx, selectedNode, nodes, this.camera.zoom);
            }
        }

        this.camera.restore(this.ctx);

        // EXTRA SAFETY: Ensure context is clean before UI
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;

        // Render screen-space UI (tooltips)
        UIRenderer.renderTooltips(this.ctx, nodes, this.camera, hoveredNodeId, draggingNodeId);
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
