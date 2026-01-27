/**
 * Base Command class for the Pipeline Designer
 */
import { DesignerEvents } from '../core/DesignerEvents.js';

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

    /**
     * Emite un evento cuando se ejecuta un comando
     */
    emitEvent(eventType, eventData) {
        DesignerEvents.emit(`command:${eventType}`, {
            ...eventData,
            command: this.constructor.name,
            timestamp: this.timestamp
        });
    }
}
