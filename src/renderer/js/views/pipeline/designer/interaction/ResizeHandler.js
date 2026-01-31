
import { InteractionHandler } from '../InteractionHandler.js';
import { GeometryUtils } from '../GeometryUtils.js';
// Removed direct imports of nodeRepository and interactionState
import { DimensionSync } from '../DimensionSync.js';
import { BoundsCalculator } from '../utils/BoundsCalculator.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';

export class ResizeHandler extends InteractionHandler {
    static DEBUG = false; // Set to true for resize debugging

    constructor(dependencies) {
        super(dependencies);
    }

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
            const nextNodes = { ...nodes };
            const newLogicalW = sync.w / vScale;
            const newLogicalH = sync.h / vScale;

            nextNodes[nodeId] = {
                ...node,
                dimensions: {
                    ...node.dimensions,
                    w: newLogicalW,
                    h: newLogicalH
                }
            };
            this.nodeRepository.setNodes(nextNodes);

            // Fetch the updated node for capture
            const updatedNode = nextNodes[nodeId];
            this.interactionState.startResize(nodeId, {
                corner: corner,
                startMouse: { ...initialPos },
                startPos: { x: updatedNode.x, y: updatedNode.y },
                startLogicalSize: {
                    w: updatedNode.dimensions.w,
                    h: updatedNode.dimensions.h
                },
                startVisualSize: {
                    w: sync.w,
                    h: sync.h
                },
                childPositions: this.captureChildPositions(updatedNode, nextNodes)
            });
        } else {
            // ROBUST PATTERN: Store ALL resize state in specialized store (Single Source of Truth)
            this.interactionState.startResize(nodeId, {
                corner: corner,
                startMouse: { ...initialPos },
                startPos: { x: node.x, y: node.y },
                startLogicalSize: {
                    w: node.dimensions.w,
                    h: node.dimensions.h
                },
                startVisualSize: {
                    w: sync.w,
                    h: sync.h
                },
                childPositions: this.captureChildPositions(node, nodes)
            });
        }

        // Mark handler as active (local flag only for performance checks)
        this._active = true;
    }
    onUpdate(e) {
        // ROBUST PATTERN: Read state from specialized interaction store
        const interaction = this.interactionState.state;
        const { resizingNodeId, resize } = interaction;
        if (!resizingNodeId || !resize.startMouse) return;

        const mousePos = this.controller.screenToWorld(this.controller.getMousePos(e));
        const nodes = this.controller.nodes;
        const node = nodes[resizingNodeId];

        if (!node || !node.dimensions) return;

        const dx = mousePos.x - resize.startMouse.x;
        const dy = mousePos.y - resize.startMouse.y;
        const zoom = this.controller.state?.zoomScale || 1.0;

        const logicalStart = resize.startLogicalSize;

        const vScale = GeometryUtils.getVisualScale(zoom);

        // Logic normalization: dx/dy are world coordinates.
        // CRITICAL SYNC: Since the visual box is inflated by vScale, a 1-unit movement of the mouse
        // corresponds to a 1/vScale movement in logical dimensions to keep the handle under the cursor.
        const result = GeometryUtils.calculateResizeDelta(
            resize.corner,
            logicalStart.w,
            logicalStart.h,
            dx / vScale,
            dy / vScale,
            resize.startPos.x,
            resize.startPos.y
        );

        // PIVOT LOGIC: Calculate the pivot point (the corner that stays still)
        // For 'se' corner drag, the pivot is 'nw' corner, etc.
        const pivotX = resize.corner.includes('w') ? resize.startPos.x + logicalStart.w / 2 : resize.startPos.x - logicalStart.w / 2;
        const pivotY = resize.corner.includes('n') ? resize.startPos.y + logicalStart.h / 2 : resize.startPos.y - logicalStart.h / 2;

        const { STICKY_NOTE, CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
        const minW = node.isStickyNote ? STICKY_NOTE.MIN_W : CONTAINER.MIN_W;
        let minH = node.isStickyNote ? STICKY_NOTE.MIN_H : CONTAINER.MIN_H;
        let actualMinW = minW;

        if ((node.isStickyNote || node.isRepoContainer) && node.dimensions) {
            if (node.dimensions.contentMinH) minH = Math.max(minH, node.dimensions.contentMinH);
            if (node.dimensions.contentMinW) actualMinW = Math.max(minW, node.dimensions.contentMinW);
        }

        if (node.isRepoContainer && node.label) {
            actualMinW = Math.max(actualMinW, BoundsCalculator.calculateTitleMinWidth(node.label, zoom));
        }

        // Apply clamping to dimensions
        newW = Math.max(actualMinW, newW);
        newH = Math.max(minH, newH);

        // PIVOT LOGIC: Calculate NEW center based on pivot and new dimensions
        // The center always moves by half the delta of the dimensions relative to the pivot.
        const signX = resize.corner.includes('w') ? -1 : 1;
        const signY = resize.corner.includes('n') ? -1 : 1;

        const newX = pivotX + (newW / 2) * signX;
        const newY = pivotY + (newH / 2) * signY;

        // ATOMIC UPDATE: Collect all changes into one Store call to avoid state-fight
        const nextNodes = { ...nodes };
        nextNodes[node.id] = {
            ...node,
            x: newX,
            y: newY,
            dimensions: {
                ...node.dimensions,
                w: newW,
                h: newH,
                isManual: true
            }
        };

        if (node.isRepoContainer && resize.childPositions) {
            this.updateChildrenPositions(node, newW, newH, nextNodes, resize);
        }

        if (ResizeHandler.DEBUG) {
            console.log(`[StateTrace] RESIZE_DRAG: ${node.id} | w:${newW.toFixed(1)} h:${newH.toFixed(1)}`);
        }

        // OPTIMIZATION: Use batchUpdateNodes to avoid full cache clear
        const updates = {};
        Object.keys(nextNodes).forEach(id => {
            // Only include nodes that changed (targeting container + children)
            const oldNode = nodes[id];
            const newNode = nextNodes[id];
            if (newNode.x !== oldNode.x || newNode.y !== oldNode.y || (newNode.dimensions && (newNode.dimensions.w !== oldNode.dimensions.w || newNode.dimensions.h !== oldNode.dimensions.h))) {
                updates[id] = {
                    x: newNode.x,
                    y: newNode.y,
                    dimensions: newNode.dimensions
                };
            }
        });

        this.nodeRepository.batchUpdateNodes(updates);


        // Trigger local renderer
        this.controller.onUpdate?.();
    }

    onEnd(e) {
        try {
            // ISSUE #8: Validate node still exists before completing resize
            const resizingNodeId = this.interactionState.state.resizingNodeId;
            if (resizingNodeId) {
                const node = this.nodeRepository.getNode(resizingNodeId);
                if (!node) {
                    console.warn('[ResizeHandler] Node was deleted mid-resize, cleaning up:', resizingNodeId);
                }
            }
        } finally {
            // ROBUST PATTERN: Clear resize state from specialized store
            this.interactionState.clearResize();
            this._active = false;
        }
    }

    onCancel() {
        // ROBUST PATTERN: Clear resize state from specialized store
        this.interactionState.clearResize();
        this._active = false;
    }

    // --- Helpers ---

    captureChildPositions(containerNode, nodes) {
        const positions = {};
        // OPTIMIZATION: Use getChildren (O(1)) instead of Object.values(nodes).forEach (O(N))
        const children = this.nodeRepository.getChildren(containerNode.id);

        children.forEach(child => {
            positions[child.id] = {
                relX: child.x - containerNode.x,
                relY: child.y - containerNode.y
            };
        });
        return positions;
    }

    updateChildrenPositions(containerNode, newWidth, newHeight, nextNodes, resizeState) {
        const startWidth = resizeState.startLogicalSize.w;
        const startHeight = resizeState.startLogicalSize.h;
        const margin = DESIGNER_CONSTANTS.INTERACTION.RESIZE_MARGIN;

        const scaleX = (newWidth - margin * 2) / Math.max(startWidth - margin * 2, 1);
        const scaleY = (newHeight - margin * 2) / Math.max(startHeight - margin * 2, 1);

        const bounds = {
            minX: containerNode.x - newWidth / 2 + margin,
            minY: containerNode.y - newHeight / 2 + margin,
            maxX: containerNode.x + newWidth / 2 - margin,
            maxY: containerNode.y + newHeight / 2 - margin
        };

        // OPTIMIZATION: Use getChildren (O(1))
        const children = this.nodeRepository.getChildren(containerNode.id);

        children.forEach(child => {
            if (resizeState.childPositions[child.id]) {
                const startRel = resizeState.childPositions[child.id];

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
        const zoom = this.cameraState.state?.zoomScale || 1.0;
        const selectedNodeId = this.interactionState.state.selectedNodeId;

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
            if (hit && ResizeHandler.DEBUG) {
                console.log(`[ResizeHit] Found handle for ${node.id} at ${hit.corner}`);
            }
            if (hit) return hit;
        }

        // If no handles are found, return null
        return null;
    }

    _checkNodeHandles(node, worldPos, nodes, zoom) {
        // Visual Threshold: 14px on screen radius (28px diameter).
        const baseThreshold = DESIGNER_CONSTANTS.INTERACTION.HIT_THRESHOLD;
        const dynamicThreshold = baseThreshold / Math.max(zoom, 0.1);
        const hitThreshold = Math.max(
            DESIGNER_CONSTANTS.INTERACTION.HIT_MIN,
            Math.min(DESIGNER_CONSTANTS.INTERACTION.HIT_MAX, dynamicThreshold)
        );

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

/**
 * EXPORT: Exponer globalmente para debugging (solo en desarrollo)
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.ResizeHandler = ResizeHandler;
}
