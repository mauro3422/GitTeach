/**
 * Base Command class for the Pipeline Designer
 */
export class DesignerCommand {
    constructor(description = '') {
        this.description = description;
        this.timestamp = Date.now();
    }

    execute() {
        throw new Error('execute() must be implemented by subclass');
    }

    undo() {
        throw new Error('undo() must be implemented by subclass');
    }

    canExecute() {
        return true;
    }

    canUndo() {
        return true;
    }
}
