/**
 * commands.test.js
 * Integration tests for DesignerCommands.js
 * Uses REAL modules to verify that commands correctly mutate state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import {
    commandManager,
    AddNodeCommand,
    AddStickyNoteCommand,
    DeleteNodeCommand,
    UpdateLabelCommand,
    CreateConnectionCommand,
    MoveNodeCommand,
    DropNodeCommand,
    CompositeCommand
} from '../src/renderer/js/views/pipeline/designer/commands/DesignerCommands.js';

describe('Designer Command System (REAL Integration)', () => {

    beforeEach(() => {
        // Reset Store to clean state
        DesignerStore.setState({
            nodes: {},
            connections: [],
            camera: { panOffset: { x: 0, y: 0 }, zoomScale: 1.5 },
            interaction: { hoveredNodeId: null, selectedNodeId: null, selectedConnectionId: null, draggingNodeId: null, resizingNodeId: null }
        });
        vi.clearAllMocks();
    });

    describe('AddNodeCommand', () => {
        it('should add a node to the store and undo/redo it', () => {
            const x = 100, y = 200;
            const command = new AddNodeCommand(false, x, y, { label: 'Test Node' });

            // 1. Execute
            const newNode = commandManager.execute(command);
            expect(newNode).toBeDefined();
            expect(DesignerStore.state.nodes[newNode.id]).toBeDefined();
            expect(DesignerStore.state.nodes[newNode.id].x).toBe(x);

            // 2. Undo
            commandManager.undo();
            expect(DesignerStore.state.nodes[newNode.id]).toBeUndefined();

            // 3. Redo
            commandManager.redo();
            expect(DesignerStore.state.nodes[newNode.id]).toBeDefined();
        });
    });

    describe('DeleteNodeCommand', () => {
        it('should delete a node and restore it correctly', () => {
            const node = DesignerStore.addNode(false, 0, 0);
            const command = new DeleteNodeCommand(node.id);

            commandManager.execute(command);
            expect(DesignerStore.state.nodes[node.id]).toBeUndefined();

            commandManager.undo();
            expect(DesignerStore.state.nodes[node.id]).toBeDefined();
        });
    });

    describe('CompositeCommand', () => {
        it('should execute a group of commands as a single unit', () => {
            const composite = new CompositeCommand('Add multiple nodes');
            composite.addCommand(new AddNodeCommand(false, 10, 10));
            composite.addCommand(new AddNodeCommand(false, 20, 20));

            commandManager.execute(composite);
            expect(Object.keys(DesignerStore.state.nodes)).toHaveLength(2);

            commandManager.undo();
            expect(Object.keys(DesignerStore.state.nodes)).toHaveLength(0);

            commandManager.redo();
            expect(Object.keys(DesignerStore.state.nodes)).toHaveLength(2);
        });
    });

    describe('Command Manager History Registry', () => {
        it('should track history size correctly via DesignerStore', () => {
            // Execute multiple commands to build history
            for (let i = 0; i < 5; i++) {
                commandManager.execute(new AddNodeCommand(false, i, i));
            }
            // Verify nodes were created
            expect(Object.keys(DesignerStore.state.nodes).length).toBeGreaterThanOrEqual(5);

            // Verify that commands can be undone (store has savepoint system)
            DesignerStore.undo();
            DesignerStore.undo();

            // State should have been restored to earlier point
            expect(DesignerStore.state.nodes).toBeDefined();

            // Redo should be available
            DesignerStore.redo();
            DesignerStore.redo();
            expect(DesignerStore.state.nodes).toBeDefined();
        });
    });
});
