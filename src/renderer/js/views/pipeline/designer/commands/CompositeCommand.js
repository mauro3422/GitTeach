import { DesignerCommand } from './DesignerCommand.js';

/**
 * Composite command for bulk operations
 */
export class CompositeCommand extends DesignerCommand {
    constructor(description = 'Composite operation') {
        super(description);
        this.commands = [];
    }

    addCommand(command) {
        this.commands.push(command);
    }

    execute() {
        const results = [];
        for (const command of this.commands) {
            if (command.canExecute()) {
                results.push(command.execute());
            }
        }
        console.log(`[CompositeCommand] Executed ${this.commands.length} commands`);
        return results;
    }

    undo() {
        const results = [];
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            const command = this.commands[i];
            if (command.canUndo()) {
                results.push(command.undo());
            }
        }
        console.log(`[CompositeCommand] Undid ${this.commands.length} commands`);
        return results;
    }
}
