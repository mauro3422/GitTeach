import { DesignerCommand } from './DesignerCommand.js';
import { DesignerStore } from '../modules/DesignerStore.js';

/**
 * Command for adding a new node
 */
export class AddNodeCommand extends DesignerCommand {
    constructor(isContainer = false, x = 0, y = 0, options = {}) {
        super(`Add ${isContainer ? 'container' : 'node'} at (${x}, ${y})`);
        this.isContainer = isContainer;
        this.x = x;
        this.y = y;
        this.options = options;
        this.nodeId = null;
    }

    execute() {
        if (this.node) {
            // Restore existing node on redo
            const nodes = { ...DesignerStore.state.nodes, [this.node.id]: this.node };
            DesignerStore.setNodes(nodes);
            return this.node;
        }

        const newNode = DesignerStore.addNode(this.isContainer, this.x, this.y, this.options);
        this.node = { ...newNode }; // Snapshot the state
        this.nodeId = newNode.id;
        console.log(`[AddNodeCommand] Added ${this.isContainer ? 'container' : 'node'}: ${this.nodeId}`);
        return newNode;
    }

    undo() {
        if (this.nodeId) {
            DesignerStore.removeNode(this.nodeId);
            console.log(`[AddNodeCommand] Undid addition of: ${this.nodeId}`);
        }
    }
}
