
import { InteractionHandler } from '../InteractionHandler.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { DesignerStore } from '../modules/DesignerStore.js';

export class ResizeHandler extends InteractionHandler {

    onStart(e, context) {
        const { nodeId, corner, initialPos } = context;
        const nodes = this.controller.nodes;
        const node = nodes[nodeId];
        const zoom = this.controller.state?.zoomScale || 1.0;

        if (!node || !node.dimensions) return;

        const bounds = node.isRepoContainer
            ? GeometryUtils.getContainerBounds(node, nodes, zoom)
            : GeometryUtils.getStickyNoteBounds(node, null, zoom);

        this.setState({
            resizingNodeId: nodeId,
            resizeCorner: corner,
            resizeStartMouse: { ...initialPos },
            resizeStartLogicalSize: {
                w: node.dimensions.w,
                h: node.dimensions.h
            },
            resizeChildPositions: this.captureChildPositions(node, nodes)
        });
    }

    onUpdate(e) {
        const state = this.getState();
        if (!state.resizingNodeId) return;

        const mousePos = this.controller.screenToWorld(this.controller.getMousePos(e));
        const nodes = this.controller.nodes;
        const node = nodes[state.resizingNodeId];

        if (!node || !node.dimensions) return;

        const dx = mousePos.x - state.resizeStartMouse.x;
        const dy = mousePos.y - state.resizeStartMouse.y;
        const zoom = this.controller.state?.zoomScale || 1.0;

        const logicalStart = state.resizeStartLogicalSize;

        // SYSTEMIC FIX: We calculate the scale of the node as it WOULD be at its STARTING
        // dimensions but at the CURRENT zoom, to map the absolute delta stably.
        const startNode = { ...node, dimensions: logicalStart };
        const bounds = node.isRepoContainer
            ? GeometryUtils.getContainerBounds(startNode, nodes, zoom)
            : GeometryUtils.getStickyNoteBounds(startNode, null, zoom);

        const effectiveScaleW = bounds.renderW / logicalStart.w;
        const effectiveScaleH = bounds.renderH / logicalStart.h;

        const dimensions = GeometryUtils.calculateResizeDelta(
            state.resizeCorner,
            logicalStart.w,
            logicalStart.h,
            dx / effectiveScaleW,
            dy / effectiveScaleH
        );

        let newW = dimensions.w;
        let newH = dimensions.h;

        const minW = node.isStickyNote ? 180 : 140;
        let minH = node.isStickyNote ? 100 : 100;
        let actualMinW = minW;

        if ((node.isStickyNote || node.isRepoContainer) && node.dimensions) {
            if (node.dimensions.contentMinH) minH = Math.max(minH, node.dimensions.contentMinH);
            if (node.dimensions.contentMinW) actualMinW = Math.max(minW, node.dimensions.contentMinW);
        }

        newW = Math.max(actualMinW, newW);
        newH = Math.max(minH, newH);

        node.dimensions.w = newW;
        node.dimensions.h = newH;
        node.dimensions.isManual = true;

        if (node.isRepoContainer && state.resizeChildPositions) {
            this.scaleChildrenProportionally(node, newW, newH, nodes);
        }
    }

    onEnd(e) {
        this.clearState();
    }

    onCancel() {
        this.clearState();
    }

    // --- Helpers ---

    captureChildPositions(containerNode, nodes) {
        const positions = {};
        Object.values(nodes).forEach(child => {
            if (child.parentId === containerNode.id) {
                positions[child.id] = {
                    relX: child.x - containerNode.x,
                    relY: child.y - containerNode.y
                };
            }
        });
        return positions;
    }

    scaleChildrenProportionally(containerNode, newWidth, newHeight, nodes) {
        const state = this.getState();
        const startWidth = state.resizeStartLogicalSize.w;
        const startHeight = state.resizeStartLogicalSize.h;
        const margin = 40;
        const zoom = this.controller.state?.zoomScale || 1.0;

        const scaleX = (newWidth - margin * 2) / Math.max(startWidth - margin * 2, 1);
        const scaleY = (newHeight - margin * 2) / Math.max(startHeight - margin * 2, 1);

        // Get actual center from bounds (respects auto-layout)
        const containerBounds = GeometryUtils.getContainerBounds(containerNode, nodes, zoom);
        const centerX = containerBounds.centerX || containerNode.x;
        const centerY = containerBounds.centerY || containerNode.y;

        const bounds = {
            minX: centerX - newWidth / 2 + margin,
            minY: centerY - newHeight / 2 + margin,
            maxX: centerX + newWidth / 2 - margin,
            maxY: centerY + newHeight / 2 - margin
        };

        Object.values(nodes).forEach(child => {
            if (child.parentId === containerNode.id && state.resizeChildPositions[child.id]) {
                const startRel = state.resizeChildPositions[child.id];
                child.x = centerX + startRel.relX * scaleX;
                child.y = centerY + startRel.relY * scaleY;

                child.x = Math.max(bounds.minX, Math.min(bounds.maxX, child.x));
                child.y = Math.max(bounds.minY, Math.min(bounds.maxY, child.y));
            }
        });
    }

    findResizeHandle(worldPos) {
        const nodes = this.controller.nodes;
        const zoom = this.controller.state?.zoomScale || 1.0;
        const selectedNodeId = DesignerStore.state.interaction.selectedNodeId;

        // Priority logic for resize handles detection:
        // 1. If there's a selected node and it's resizable, prioritize its handles
        if (selectedNodeId && nodes[selectedNodeId]) {
            const selectedNode = nodes[selectedNodeId];
            if (selectedNode.isRepoContainer || selectedNode.isStickyNote) {
                const hit = this._checkNodeHandles(selectedNode, worldPos, nodes, zoom);
                if (hit) return hit;
            }
        }

        // 2. If no node is selected OR the selected node is not resizable,
        // allow detection on other visible resizable nodes
        // Iterate in reverse order to check topmost nodes first (visual hierarchy)
        const nodeList = Object.values(nodes);
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];

            // Skip if it's not a resizable node or if it's the selected node (already checked)
            if ((!node.isRepoContainer && !node.isStickyNote) || node.id === selectedNodeId) {
                continue;
            }

            const hit = this._checkNodeHandles(node, worldPos, nodes, zoom);
            if (hit) return hit;
        }

        // If no handles are found, return null
        return null;
    }

    _checkNodeHandles(node, worldPos, nodes, zoom) {
        // Visual Threshold: 14px on screen radius (28px diameter).
        // Matches standard UI hit targets.
        // Improved calculation with bounded range to prevent extreme values
        const minThreshold = 8;   // Minimum threshold in pixels
        const maxThreshold = 30;  // Maximum threshold in pixels
        const baseThreshold = 14;
        const dynamicThreshold = baseThreshold / Math.max(zoom, 0.1);
        const hitThreshold = Math.max(minThreshold, Math.min(maxThreshold, dynamicThreshold));

        // For sticky notes, we need to account for text content that affects visual dimensions
        // For containers, we can use logical dimensions as they typically don't change based on content
        let w, h, centerX, centerY;

        if (node.isStickyNote) {
            // For sticky notes, get the visual bounds which account for text content
            const bounds = GeometryUtils.getStickyNoteBounds(node, null, zoom);
            // Use the visual dimensions for handle positioning to match what user sees
            w = bounds.renderW || bounds.w;
            h = bounds.renderH || bounds.h;
            centerX = bounds.centerX || node.x;
            centerY = bounds.centerY || node.y;
        } else if (node.isRepoContainer) {
            // For containers, use the container bounds
            const bounds = GeometryUtils.getContainerBounds(node, nodes, zoom);
            w = bounds.renderW || bounds.w;
            h = bounds.renderH || bounds.h;
            centerX = bounds.centerX || node.x;
            centerY = bounds.centerY || node.y;
        } else {
            // For other node types, use logical dimensions with node position as center
            w = node.dimensions?.w || (node.isStickyNote ? 180 : 140);
            h = node.dimensions?.h || (node.isStickyNote ? 100 : 100);
            centerX = node.x;
            centerY = node.y;
        }

        const corners = GeometryUtils.getRectCorners(centerX, centerY, w, h);

        let bestHit = null;
        let minDistance = Infinity;

        for (const [corner, pos] of Object.entries(corners)) {
            const dist = GeometryUtils.getDistance(worldPos, pos);
            if (dist < hitThreshold && dist < minDistance) {
                minDistance = dist;
                bestHit = { nodeId: node.id, corner };
            }
        }

        return bestHit;
    }

    getResizeCursor(corner) {
        const cursors = { 'nw': 'nw-resize', 'ne': 'ne-resize', 'sw': 'sw-resize', 'se': 'se-resize' };
        return cursors[corner] || 'default';
    }
}
