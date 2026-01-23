import { DesignerCommand } from './DesignerCommand.js';
import { DesignerStore } from '../modules/DesignerStore.js';

/**
 * Command for deleting a connection
 */
export class DeleteConnectionCommand extends DesignerCommand {
    constructor(connectionId) {
        super(`Delete connection: ${connectionId}`);
        this.connectionId = connectionId;
        this.connectionData = null;
    }

    execute() {
        // Store connection data for undo
        const conn = DesignerStore.state.connections.find(c => {
            const id = c.id || `${c.from}-${c.to}`;
            return id === this.connectionId;
        });

        if (!conn) return false;

        this.connectionData = { ...conn };

        // Delete connection
        DesignerStore.deleteConnection(this.connectionId);
        console.log(`[DeleteConnectionCommand] Deleted connection: ${this.connectionId}`);
        return true;
    }

    undo() {
        if (!this.connectionData) return false;

        // Restore connection
        DesignerStore.addConnection(this.connectionData.from, this.connectionData.to, this.connectionData.id);

        console.log(`[DeleteConnectionCommand] Restored connection: ${this.connectionId}`);
        return true;
    }
}
