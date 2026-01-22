
import { InteractionHandler } from '../InteractionHandler.js';

export class ConnectionHandler extends InteractionHandler {

    constructor(controller) {
        super(controller);
        this.activeConnection = null;
    }

    onStart(e, context) {
        const { fromNode, startPos } = context;
        this.setState({
            fromNode: fromNode,
            currentPos: { ...startPos }
        });
    }

    onUpdate(e) {
        // We expect the controller to call this on mousemove
        const worldPos = this.controller.screenToWorld(this.controller.getMousePos(e));
        this.setState({ currentPos: { ...worldPos } });
    }

    // Connection interaction is click-based, so logic sits mainly in handleClick
    // But we implement onEnd/onCancel for cleanup
    onEnd(e) {
        this.clearState();
    }

    onCancel() {
        this.clearState();
    }

    handleClick(e, clickedNode, onConnection) {
        if (this.isActive()) {
            // Finish connection
            const state = this.getState();
            if (clickedNode && clickedNode.id !== state.fromNode.id) {
                if (onConnection) {
                    onConnection(state.fromNode.id, clickedNode.id);
                }
            }
            this.cancel();
        } else {
            // Start connection
            if (clickedNode) {
                const worldPos = this.controller.screenToWorld(this.controller.getMousePos(e));
                this.start(e, { fromNode: clickedNode, startPos: worldPos });
            }
        }
    }

    isDrawing() {
        return this.isActive();
    }

    drawActiveLine(designerCanvas, navState) {
        if (!this.isActive()) return;

        const state = this.getState();
        if (!state.fromNode || !state.currentPos) return;

        designerCanvas.drawActiveLine(state.fromNode, state.currentPos, navState);
    }
}
