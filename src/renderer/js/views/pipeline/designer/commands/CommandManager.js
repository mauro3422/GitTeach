/**
 * Command Manager - handles command execution
 *
 * ARCHITECTURE NOTE (2026-01):
 * This class implements the Command Pattern for executing reversible operations.
 * However, the actual undo/redo functionality is handled by HistoryManager (state snapshots),
 * not by this class. The undo()/redo() methods here are currently NOT wired to Ctrl+Z/Ctrl+Y.
 *
 * Current flow:
 * - User action → commandManager.execute(command) → Command.execute() modifies DesignerStore
 * - Ctrl+Z → DesignerStore.undo() → HistoryManager (snapshot-based)
 *
 * The execute() method is the primary function used. Commands store their own undo logic
 * but HistoryManager provides the actual undo/redo via snapshots.
 *
 * TODO: Consider consolidating to use either Command-based or Snapshot-based undo exclusively.
 */
export class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 50;
    }

    execute(command) {
        if (!command.canExecute()) {
            console.warn('[CommandManager] Command cannot be executed:', command.description);
            return false;
        }

        const result = command.execute();
        if (result !== false) {
            this.undoStack.push(command);
            this.redoStack = []; // Clear redo stack on new command

            // Limit history size
            if (this.undoStack.length > this.maxHistorySize) {
                this.undoStack.shift();
            }

            console.log(`[CommandManager] Executed: ${command.description}`);
        }
        return result;
    }

    undo() {
        const command = this.undoStack.pop();
        if (!command) return false;

        if (!command.canUndo()) {
            console.warn('[CommandManager] Command cannot be undone:', command.description);
            this.undoStack.push(command); // Put it back
            return false;
        }

        const result = command.undo();
        if (result !== false) {
            this.redoStack.push(command);
            console.log(`[CommandManager] Undid: ${command.description}`);
        } else {
            this.undoStack.push(command); // Put it back if undo failed
        }
        return result;
    }

    redo() {
        const command = this.redoStack.pop();
        if (!command) return false;

        if (!command.canExecute()) {
            console.warn('[CommandManager] Command cannot be redone:', command.description);
            this.redoStack.push(command); // Put it back
            return false;
        }

        const result = command.execute();
        if (result !== false) {
            this.undoStack.push(command);
            console.log(`[CommandManager] Redid: ${command.description}`);
        } else {
            this.redoStack.push(command); // Put it back if redo failed
        }
        return result;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        console.log('[CommandManager] History cleared');
    }

    getHistorySize() {
        return {
            undo: this.undoStack.length,
            redo: this.redoStack.length
        };
    }
}
