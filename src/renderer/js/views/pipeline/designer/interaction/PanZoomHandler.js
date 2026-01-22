
import { InteractionHandler } from '../InteractionHandler.js';
import { CoordinateUtils } from '../CoordinateUtils.js';
import { AnimationManager } from '../AnimationManager.js';

export class PanZoomHandler extends InteractionHandler {

    constructor(controller) {
        super(controller);
        this.state = {
            panOffset: { x: 0, y: 0 },
            zoomScale: 1.0,
            isPanning: false,
            panStart: null,
            minZoom: 0.3,
            maxZoom: 4.0
        };
    }

    init(config) {
        if (config) {
            if (config.panOffset) this.state.panOffset = config.panOffset;
            if (config.zoomScale) this.state.zoomScale = config.zoomScale;
        }
    }

    // --- InteractionHandler Implementation ---

    onStart(e, context) {
        // Context might contain initial mouse pos
        const rawPos = context && context.rawPos ? context.rawPos : this.controller.getMousePos(e);

        this.setState({
            isPanning: true,
            panStart: { ...rawPos }
        });

        // Use setCursor if available on controller, or set directly
        if (this.controller.canvas) {
            this.controller.canvas.style.cursor = 'grabbing';
        }
    }

    onUpdate(e) {
        const state = this.getState();
        if (!state.isPanning || !state.panStart) return;

        const rawPos = this.controller.getMousePos(e);
        const dx = rawPos.x - state.panStart.x;
        const dy = rawPos.y - state.panStart.y;

        this.state.panOffset.x += dx;
        this.state.panOffset.y += dy;
        this.state.panStart = { ...rawPos };
    }

    onEnd(e) {
        this.setState({
            isPanning: false,
            panStart: null
        });
        if (this.controller.canvas) {
            this.controller.canvas.style.cursor = 'default'; // Or restore previous
        }
    }

    onCancel() {
        this.onEnd();
    }

    // --- Specialized Methods ---

    handleWheel(e, onUpdate) {
        const deltaY = e.deltaY;
        const mousePos = this.controller.getMousePos(e);

        const delta = deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = this.state.zoomScale * delta;

        if (nextZoom >= this.state.minZoom && nextZoom <= this.state.maxZoom) {
            // Zoom towards mouse position
            // Use local screenToWorld since we have the state here
            const worldPos = CoordinateUtils.screenToWorld(mousePos, this.state);

            this.state.zoomScale = nextZoom;

            // Adjust pan
            const newScreenPos = CoordinateUtils.worldToScreen(worldPos, this.state);
            this.state.panOffset.x += mousePos.x - newScreenPos.x;
            this.state.panOffset.y += mousePos.y - newScreenPos.y;

            if (onUpdate) onUpdate();
        }
    }

    centerOnNode(node, canvasSize, drawerWidth = 0) {
        const targetX = (canvasSize.width - drawerWidth) / 2;
        const targetY = canvasSize.height / 2;

        const targetPanX = targetX - (node.x * this.state.zoomScale);
        const targetPanY = targetY - (node.y * this.state.zoomScale);

        this.animatePan(targetPanX, targetPanY, () => {
            if (this.controller.onUpdate) this.controller.onUpdate();
        });
    }

    animatePan(targetX, targetY, onUpdate) {
        const startX = this.state.panOffset.x;
        const startY = this.state.panOffset.y;
        const duration = 400; // ms
        const startTime = performance.now();

        AnimationManager.registerTween({
            id: 'pan-animation',
            animate: () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing: easeOutCubic
                const ease = 1 - Math.pow(1 - progress, 3);

                this.state.panOffset.x = startX + (targetX - startX) * ease;
                this.state.panOffset.y = startY + (targetY - startY) * ease;

                if (onUpdate) onUpdate();

                if (progress >= 1) {
                    AnimationManager.unregisterTween({ id: 'pan-animation' });
                }
            }
        });
    }
}
