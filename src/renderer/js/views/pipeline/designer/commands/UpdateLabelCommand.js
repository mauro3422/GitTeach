import { DesignerCommand } from './DesignerCommand.js';
import { DesignerStore } from '../modules/DesignerStore.js';

/**
 * Command for updating node label/message
 */
export class UpdateLabelCommand extends DesignerCommand {
    constructor(nodeId, newLabel, oldLabel = null) {
        super(`Update label of ${nodeId}`);
        this.nodeId = nodeId;
        this.newLabel = newLabel;
        this.oldLabel = oldLabel;
    }

    execute() {
        const node = DesignerStore.getNode(this.nodeId);
        if (!node) return false;

        if (this.oldLabel === null) {
            this.oldLabel = node.message || node.label || '';
        }

        DesignerStore.updateNode(this.nodeId, {
            message: this.newLabel,
            label: this.newLabel
        });

        console.log(`[UpdateLabelCommand] Updated label of ${this.nodeId}`);
        return true;
    }

    undo() {
        const node = DesignerStore.getNode(this.nodeId);
        if (!node) return false;

        DesignerStore.updateNode(this.nodeId, {
            message: this.oldLabel,
            label: this.oldLabel
        });

        console.log(`[UpdateLabelCommand] Reverted label of ${this.nodeId}`);
        return true;
    }
}
