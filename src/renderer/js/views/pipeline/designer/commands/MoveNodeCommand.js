import { DesignerCommand } from './DesignerCommand.js';
import { DesignerStore } from '../modules/DesignerStore.js';

/**
 * Command for moving a node
 */
export class MoveNodeCommand extends DesignerCommand {
    constructor(nodeId, newX, newY, oldX = null, oldY = null) {
        super(`Move ${nodeId} to (${newX}, ${newY})`);
        this.nodeId = nodeId;
        this.newX = newX;
        this.newY = newY;
        this.oldX = oldX;
        this.oldY = oldY;
    }

    execute() {
        const node = DesignerStore.getNode(this.nodeId);
        if (!node) return false;

        if (this.oldX === null || this.oldY === null) {
            this.oldX = node.x;
            this.oldY = node.y;
        }

        DesignerStore.updateNode(this.nodeId, {
            x: this.newX,
            y: this.newY
        });

        console.log(`[MoveNodeCommand] Moved ${this.nodeId} to (${this.newX}, ${this.newY})`);
        return true;
    }

    undo() {
        const node = DesignerStore.getNode(this.nodeId);
        if (!node) return false;

        DesignerStore.updateNode(this.nodeId, {
            x: this.oldX,
            y: this.oldY
        });

        console.log(`[MoveNodeCommand] Moved ${this.nodeId} back to (${this.oldX}, ${this.oldY})`);
        return true;
    }
}
