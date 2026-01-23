/**
 * Command Manager - Unified command execution with HistoryManager integration
 *
 * ARCHITECTURE (2026-01 CONSOLIDATED):
 * This class executes Commands AND integrates with HistoryManager for undo/redo.
 * All operations go through one unified history system.
 *
 * Flow:
 * - User action → commandManager.execute(command)
 *   1. Saves current state to HistoryManager (savepoint)
 *   2. Executes the command
 * - Ctrl+Z → DesignerStore.undo() → HistoryManager restores previous state
 *
 * This ensures ALL command executions are undoable via the same system.
 */
import { DesignerStore } from '../modules/DesignerStore.js';

export class CommandManager {
    constructor() {
        // No internal stacks - we delegate to HistoryManager via DesignerStore
    }

    /**
     * Execute a command with automatic savepoint for undo support
     * @param {Object} command - Command object with execute(), canExecute(), description
     * @returns {*} Result of command execution, or false if failed
     */
    execute(command) {
        if (!command.canExecute()) {
            console.warn('[CommandManager] Command cannot be executed:', command.description);
            return false;
        }

        // UNIFIED HISTORY: Save state BEFORE executing command
        // This makes the command undoable via DesignerStore.undo() → HistoryManager
        DesignerStore.savepoint(command.actionType || 'COMMAND', {
            description: command.description
        });

        const result = command.execute();
        if (result !== false) {
            console.log(`[CommandManager] Executed: ${command.description}`);
        }
        return result;
    }

    /**
     * Check if undo is available (delegates to HistoryManager via Store)
     */
    canUndo() {
        return DesignerStore.canUndo?.() || false;
    }

    /**
     * Check if redo is available (delegates to HistoryManager via Store)
     */
    canRedo() {
        return DesignerStore.canRedo?.() || false;
    }

    /**
     * Clear history (delegates to HistoryManager via Store)
     */
    clear() {
        DesignerStore.clearHistory?.();
        console.log('[CommandManager] History cleared');
    }
}
