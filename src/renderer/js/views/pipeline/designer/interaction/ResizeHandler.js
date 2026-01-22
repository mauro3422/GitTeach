
import { InteractionHandler } from '../InteractionHandler.js';
import { GeometryUtils } from '../GeometryUtils.js';

export class ResizeHandler extends InteractionHandler {

    onStart(e, context) {
        const { nodeId, corner, initialPos } = context;
        const nodes = this.controller.nodes;
        const node = nodes[nodeId];

        if (!node || !node.dimensions) return;

        this.setState({
            resizingNodeId: nodeId,
            resizeCorner: corner,
            resizeStartMouse: { ...initialPos },
            resizeStartSize: {
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

        let newW = state.resizeStartSize.w;
        let newH = state.resizeStartSize.h;
        // Logic duplicated, but simplified here - could move to GeometryUtils if needed? 
        // For now, keeping logic here as it implies mutation of specific state

        switch (state.resizeCorner) {
            case 'se': newW += dx * 2; newH += dy * 2; break;
            case 'sw': newW -= dx * 2; newH += dy * 2; break;
            case 'ne': newW += dx * 2; newH -= dy * 2; break;
            case 'nw': newW -= dx * 2; newH -= dy * 2; break;
        }

        const minW = node.isStickyNote ? 180 : 140;
        const minH = node.isStickyNote ? 100 : 100;

        newW = Math.max(minW, newW);
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
        const startWidth = state.resizeStartSize.w;
        const startHeight = state.resizeStartSize.h;
        const margin = 40;

        const scaleX = (newWidth - margin * 2) / Math.max(startWidth - margin * 2, 1);
        const scaleY = (newHeight - margin * 2) / Math.max(startHeight - margin * 2, 1);

        const bounds = {
            minX: containerNode.x - newWidth / 2 + margin,
            minY: containerNode.y - newHeight / 2 + margin,
            maxX: containerNode.x + newWidth / 2 - margin,
            maxY: containerNode.y + newHeight / 2 - margin
        };

        Object.values(nodes).forEach(child => {
            if (child.parentId === containerNode.id && state.resizeChildPositions[child.id]) {
                const startRel = state.resizeChildPositions[child.id];
                child.x = containerNode.x + startRel.relX * scaleX;
                child.y = containerNode.y + startRel.relY * scaleY;

                child.x = Math.max(bounds.minX, Math.min(bounds.maxX, child.x));
                child.y = Math.max(bounds.minY, Math.min(bounds.maxY, child.y));
            }
        });
    }

    findResizeHandle(worldPos) {
        const nodes = this.controller.nodes;
        const handleSize = 30;

        for (const node of Object.values(nodes).slice().reverse()) {
            if (!node.isRepoContainer && !node.isStickyNote) continue;

            const bounds = node.isRepoContainer
                ? GeometryUtils.getContainerBounds(node, nodes, 1.0)
                : {
                    w: node.dimensions?.animW || node.dimensions?.w || 180,
                    h: node.dimensions?.animH || node.dimensions?.h || 100,
                    centerX: node.x,
                    centerY: node.y
                };

            const w = bounds.w;
            const h = bounds.h;
            const centerX = bounds.centerX || node.x;
            const centerY = bounds.centerY || node.y;

            const corners = {
                'nw': { x: centerX - w / 2, y: centerY - h / 2 },
                'ne': { x: centerX + w / 2, y: centerY - h / 2 },
                'sw': { x: centerX - w / 2, y: centerY + h / 2 },
                'se': { x: centerX + w / 2, y: centerY + h / 2 }
            };

            for (const [corner, pos] of Object.entries(corners)) {
                if (Math.abs(worldPos.x - pos.x) < handleSize &&
                    Math.abs(worldPos.y - pos.y) < handleSize) {
                    return { nodeId: node.id, corner };
                }
            }
        }
        return null;
    }

    getResizeCursor(corner) {
        const cursors = { 'nw': 'nw-resize', 'ne': 'ne-resize', 'sw': 'sw-resize', 'se': 'se-resize' };
        return cursors[corner] || 'default';
    }
}
