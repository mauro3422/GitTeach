import { DesignerCommand } from './DesignerCommand.js';
import { DesignerStore } from '../modules/DesignerStore.js';

/**
 * Command for adding a sticky note
 */
export class AddStickyNoteCommand extends DesignerCommand {
    constructor(x = 0, y = 0, options = {}) {
        super(`Add sticky note at (${x}, ${y})`);
        this.x = x;
        this.y = y;
        this.options = options;
        this.nodeId = null;
    }

    execute() {
        if (this.node) {
            // Restore existing note on redo
            const nodes = { ...DesignerStore.state.nodes, [this.node.id]: this.node };
            DesignerStore.setNodes(nodes);
            return this.node;
        }

        const newNote = DesignerStore.addStickyNote(this.x, this.y, this.options);
        this.node = { ...newNote }; // Snapshot
        this.nodeId = newNote.id;
        console.log(`[AddStickyNoteCommand] Added sticky note: ${this.nodeId}`);
        return newNote;
    }

    undo() {
        if (this.nodeId) {
            DesignerStore.removeNode(this.nodeId);
            console.log(`[AddStickyNoteCommand] Undid addition of: ${this.nodeId}`);
        }
    }
}
