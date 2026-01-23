/**
 * DesignerCommands.js
 * Index file for all designer commands
 * Implements Command Pattern to decouple UI from business logic
 */

import { CommandManager } from './CommandManager.js';

// Export Command Classes
export { DesignerCommand } from './DesignerCommand.js';
export { AddNodeCommand } from './AddNodeCommand.js';
export { AddStickyNoteCommand } from './AddStickyNoteCommand.js';
export { DeleteNodeCommand } from './DeleteNodeCommand.js';
export { UpdateLabelCommand } from './UpdateLabelCommand.js';
export { CreateConnectionCommand } from './CreateConnectionCommand.js';
export { MoveNodeCommand } from './MoveNodeCommand.js';
export { DropNodeCommand } from './DropNodeCommand.js';
export { DeleteConnectionCommand } from './DeleteConnectionCommand.js';
export { CompositeCommand } from './CompositeCommand.js';

// Export singleton instance for global history management
export const commandManager = new CommandManager();
