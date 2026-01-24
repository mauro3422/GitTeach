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

        const success = DesignerStore.updateNode(this.nodeId, {
            x: this.newX,
            y: this.newY
        });

        if (success) {
            console.log(`[MoveNodeCommand] Moved ${this.nodeId} to (${this.newX}, ${this.newY})`);
        } else {
            console.warn(`[MoveNodeCommand] Failed to move ${this.nodeId}`);
        }
        return success;
    }

    undo() {
        const node = DesignerStore.getNode(this.nodeId);
        if (!node) return false;

        const success = DesignerStore.updateNode(this.nodeId, {
            x: this.oldX,
            y: this.oldY
        });

        if (success) {
            console.log(`[MoveNodeCommand] Moved ${this.nodeId} back to (${this.oldX}, ${this.oldY})`);
        } else {
            console.warn(`[MoveNodeCommand] Failed to move ${this.nodeId} back`);
        }
        return success;
    }
}
