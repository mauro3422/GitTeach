
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrawStrategy } from '../src/renderer/js/views/pipeline/designer/strategies/DrawStrategy.js';

describe('DrawStrategy Container Connections', () => {
    let strategy;
    let mockController;

    beforeEach(() => {
        mockController = {
            nodes: {
                'container1': { id: 'container1', isRepoContainer: true, x: 100, y: 100 },
                'node1': { id: 'node1', isRepoContainer: false, x: 200, y: 200 }
            },
            hoveredNodeId: null,
            getWorldPosFromEvent: vi.fn().mockReturnValue({ x: 100, y: 100 }),
            onUpdate: vi.fn(),
            onConnection: vi.fn()
        };

        // Mock InteractionState
        const mockInteractionState = {
            setDrawing: vi.fn()
        };

        strategy = new DrawStrategy({
            controller: mockController,
            interactionState: mockInteractionState
        });
    });

    it('should allow starting a connection from a container', () => {
        mockController.hoveredNodeId = 'container1';

        // Simulate mouse down on container
        strategy.handleMouseDown({ button: 0 });

        // Expect connection loop to start
        expect(strategy.isActive()).toBe(true);
        expect(strategy.connectionState.fromNode.id).toBe('container1');
    });

    it('should allow ending a connection on a container', () => {
        // Start from node1
        strategy.connectionState.fromNode = mockController.nodes['node1'];
        mockController.hoveredNodeId = 'container1';

        // Simulate click on container to finish
        strategy.handleMouseDown({ button: 0 });

        // Expect connection callback
        expect(mockController.onConnection).toHaveBeenCalledWith('node1', 'container1');
        expect(strategy.isActive()).toBe(false);
    });
});
