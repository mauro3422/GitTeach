
import { InteractionHandler } from '../InteractionHandler.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { DesignerStore } from '../modules/DesignerStore.js';
import { DimensionSync } from '../DimensionSync.js';
import { LayoutUtils } from '../utils/LayoutUtils.js';

export class ResizeHandler extends InteractionHandler {
    static DEBUG = false; // Set to true for resize debugging

    onStart(e, context) {
        const { nodeId, corner, initialPos } = context;
        const nodes = this.controller.nodes;
        const node = nodes[nodeId];
        const zoom = this.controller.state?.zoomScale || 1.0;

        if (!node || !node.dimensions) return;

        const sync = DimensionSync.getSyncDimensions(node, nodes, zoom);
        const vScale = GeometryUtils.getVisualScale(zoom);

        // SYNC: Before starting, ensure node.dimensions.w/h reflect the CURRENT visual size
        // converted back to logical units. This eliminates the "Dead Zone" jump.
        if (!node.dimensions.isManual) {
            node.dimensions.w = sync.w / vScale;
            node.dimensions.h = sync.h / vScale;
        }

        this.setState({
            resizingNodeId: nodeId,
            resizeCorner: corner,
            resizeStartMouse: { ...initialPos },
            resizeStartLogicalSize: {
                w: node.dimensions.w,
                h: node.dimensions.h
            },
            resizeStartVisualSize: {
                w: sync.w,
                h: sync.h
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

        const vScale = GeometryUtils.getVisualScale(zoom);

        // Logic normalization: dx/dy are world coordinates. 
        // We do NOT divide by vScale here because we are updating logical dimensions which are 1:1 with world.
        const dimensions = GeometryUtils.calculateResizeDelta(
            state.resizeCorner,
            logicalStart.w,
            logicalStart.h,
            dx,
            dy
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

        // For containers, ensure minimum width fits the title text (centralized calculation)
        if (node.isRepoContainer && node.label) {
            actualMinW = Math.max(actualMinW, LayoutUtils.calculateTitleMinWidth(node.label));
        }

        newW = Math.max(actualMinW, newW);
        newH = Math.max(minH, newH);

        // ATOMIC UPDATE: Collect all changes into one Store call to avoid state-fight
        const nextNodes = { ...nodes };
        nextNodes[node.id] = {
            ...node,
            dimensions: {
                ...node.dimensions,
                w: newW,
                h: newH,
                isManual: true
            }
        };

        if (node.isRepoContainer && state.resizeChildPositions) {
            this.updateChildrenPositions(node, newW, newH, nextNodes);
        }

        if (ResizeHandler.DEBUG) {
            console.log(`[StateTrace] RESIZE_DRAG: ${node.id} | w:${newW.toFixed(1)} h:${newH.toFixed(1)}`);
        }
        DesignerStore.setState({ nodes: nextNodes }, 'RESIZE_DRAG');

        // Trigger local renderer
        this.controller.onUpdate?.();
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

    updateChildrenPositions(containerNode, newWidth, newHeight, nextNodes) {
        const state = this.getState();
        const startWidth = state.resizeStartLogicalSize.w;
        const startHeight = state.resizeStartLogicalSize.h;
        const margin = 40;

        const scaleX = (newWidth - margin * 2) / Math.max(startWidth - margin * 2, 1);
        const scaleY = (newHeight - margin * 2) / Math.max(startHeight - margin * 2, 1);

        const bounds = {
            minX: containerNode.x - newWidth / 2 + margin,
            minY: containerNode.y - newHeight / 2 + margin,
            maxX: containerNode.x + newWidth / 2 - margin,
            maxY: containerNode.y + newHeight / 2 - margin
        };

        Object.values(nextNodes).forEach(child => {
            if (child.parentId === containerNode.id && state.resizeChildPositions[child.id]) {
                const startRel = state.resizeChildPositions[child.id];

                // Clone the child for the nextNodes map
                nextNodes[child.id] = {
                    ...child,
                    x: containerNode.x + startRel.relX * scaleX,
                    y: containerNode.y + startRel.relY * scaleY
                };

                // Clamp to new container bounds
                nextNodes[child.id].x = Math.max(bounds.minX, Math.min(bounds.maxX, nextNodes[child.id].x));
                nextNodes[child.id].y = Math.max(bounds.minY, Math.min(bounds.maxY, nextNodes[child.id].y));
            }
        });
    }

    findResizeHandle(worldPos) {
        const nodes = this.controller.nodes;
        const zoom = this.controller.state?.zoomScale || 1.0;
        const selectedNodeId = DesignerStore.state.interaction.selectedNodeId;

        // In test environments, selectedNodeId might be interfering with detection
        // So we'll try both approaches: selected first, then all nodes
        // 1. If there's a selected node and it's resizable, prioritize its handles
        if (selectedNodeId && nodes[selectedNodeId]) {
            const selectedNode = nodes[selectedNodeId];
            if (selectedNode.isRepoContainer || selectedNode.isStickyNote) {
                const hit = this._checkNodeHandles(selectedNode, worldPos, nodes, zoom);
                if (hit) return hit;
            }
        }

        // 2. Check all visible resizable nodes regardless of selection state
        // This ensures handles are detected even in test environments where selection state might be inconsistent
        const nodeList = Object.values(nodes);
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];

            // Only check if it's a resizable node
            if (!node.isRepoContainer && !node.isStickyNote) {
                continue;
            }

            // Skip if it's the selected node (already checked above)
            if (node.id === selectedNodeId) {
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
        const baseThreshold = 14;
        const dynamicThreshold = baseThreshold / Math.max(zoom, 0.1);
        const hitThreshold = Math.max(8, Math.min(30, dynamicThreshold));

        // Use the unified synchronization system
        const sync = DimensionSync.getSyncDimensions(node, nodes, zoom);
        const corners = GeometryUtils.getRectCorners(sync.centerX, sync.centerY, sync.w, sync.h);

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
