import { DesignerCommand } from './DesignerCommand.js';
import { DesignerStore } from '../modules/DesignerStore.js';

/**
 * Command for handling node drop (parenting)
 */
export class DropNodeCommand extends DesignerCommand {
    constructor(nodeId, containerId, oldParentId = null) {
        super(`Drop ${nodeId} into ${containerId || 'root'}`);
        this.nodeId = nodeId;
        this.containerId = containerId;
        this.oldParentId = oldParentId;
    }

    execute() {
        const node = DesignerStore.getNode(this.nodeId);
        if (!node) return false;

        if (this.oldParentId === null) {
            this.oldParentId = node.parentId || null;
        }

        DesignerStore.dropNode(this.nodeId, this.containerId);
        console.log(`[DropNodeCommand] Dropped ${this.nodeId} into ${this.containerId || 'root'}`);
        return true;
    }

    undo() {
        const node = DesignerStore.getNode(this.nodeId);
        if (!node) return false;

        const success = DesignerStore.updateNode(this.nodeId, { parentId: this.oldParentId });
        if (success) {
            console.log(`[DropNodeCommand] Restored ${this.nodeId} parent to ${this.oldParentId || 'root'}`);
        } else {
            console.warn(`[DropNodeCommand] Failed to restore ${this.nodeId} parent`);
        }
        return success;
    }
}
