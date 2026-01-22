import { DesignerCommand } from './DesignerCommand.js';
import { DesignerStore } from '../modules/DesignerStore.js';

/**
 * Command for creating a connection
 */
export class CreateConnectionCommand extends DesignerCommand {
    constructor(fromId, toId) {
        super(`Connect ${fromId} → ${toId}`);
        this.fromId = fromId;
        this.toId = toId;
    }

    execute() {
        const success = DesignerStore.addConnection(this.fromId, this.toId);
        if (success) {
            console.log(`[CreateConnectionCommand] Connected ${this.fromId} → ${this.toId}`);
        }
        return success;
    }

    undo() {
        const success = DesignerStore.removeConnection(this.fromId, this.toId);
        if (success) {
            console.log(`[CreateConnectionCommand] Disconnected ${this.fromId} → ${this.toId}`);
        }
        return success;
    }
}
