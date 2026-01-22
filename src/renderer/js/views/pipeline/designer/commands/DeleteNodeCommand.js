import { DesignerCommand } from './DesignerCommand.js';
import { DesignerStore } from '../modules/DesignerStore.js';

/**
 * Command for deleting a node
 */
export class DeleteNodeCommand extends DesignerCommand {
    constructor(nodeId) {
        super(`Delete node: ${nodeId}`);
        this.nodeId = nodeId;
        this.nodeData = null;
        this.connectionsData = null;
    }

    execute() {
        // Store node data for undo
        const node = DesignerStore.getNode(this.nodeId);
        if (!node) return false;

        this.nodeData = JSON.parse(JSON.stringify(node));

        // Store connections data
        this.connectionsData = DesignerStore.getConnectionsFor(this.nodeId).map(conn => ({ ...conn }));

        // Delete node (Store handles connections now)
        DesignerStore.removeNode(this.nodeId);
        console.log(`[DeleteNodeCommand] Deleted node: ${this.nodeId}`);
        return true;
    }

    undo() {
        if (!this.nodeData) return false;

        // Restore node via setNodes
        const nodes = { ...DesignerStore.state.nodes, [this.nodeId]: this.nodeData };
        DesignerStore.setNodes(nodes);

        // Restore connections
        this.connectionsData.forEach(conn => {
            DesignerStore.addConnection(conn.from, conn.to);
        });

        console.log(`[DeleteNodeCommand] Restored node: ${this.nodeId}`);
        return true;
    }
}
