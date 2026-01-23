// debug_resize_handler.test.js
// Test de depuración para verificar el funcionamiento del sistema de redimensionamiento

import { describe, it, expect, beforeEach } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { DimensionSync } from '../src/renderer/js/views/pipeline/designer/DimensionSync';

describe('Debug Resize Handler', () => {
    let resizeHandler;

    beforeEach(() => {
        const canvas = document.createElement('canvas');
        canvas.id = 'debug-canvas';
        canvas.width = 1920;
        canvas.height = 1080;
        document.body.appendChild(canvas);

        DesignerStore.setState({ 
            nodes: {}, 
            connections: [],
            navigation: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 },
            interaction: { hoveredNodeId: null, selectedNodeId: null, selectedConnectionId: null, draggingNodeId: null, resizingNodeId: null }
        });
        
        // Crear un controlador simulado
        const mockController = {
            nodes: DesignerStore.state.nodes,
            state: { zoomScale: 1.0 },
            screenToWorld: (pos) => pos,
            getMousePos: (e) => ({ x: e.clientX, y: e.clientY })
        };
        
        resizeHandler = new ResizeHandler(mockController);
    });

    it('should have DimensionSync available', () => {
        expect(DimensionSync).toBeDefined();
        expect(DimensionSync.getVisualDimensions).toBeDefined();
    });

    it('should calculate visual dimensions correctly', () => {
        const node = {
            id: 'debug-node',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Debug text',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        const dims = DimensionSync.getVisualDimensions(node, 1.0, {});
        
        console.log('DEBUG: Dimensions result:', dims);
        
        expect(dims).toBeDefined();
        expect(dims.centerX).toBeCloseTo(node.x);
        expect(dims.centerY).toBeCloseTo(node.y);
        expect(dims.visualW).toBeGreaterThan(0);
        expect(dims.visualH).toBeGreaterThan(0);
    });

    it('should detect resize handles with findResizeHandle', () => {
        const node = {
            id: 'debug-resize-node',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Debug resize',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        
        DesignerStore.state.nodes[node.id] = node;

        // Calcular la posición de la esquina SE usando DimensionSync
        const dims = DimensionSync.getVisualDimensions(node, 1.0, DesignerStore.state.nodes);
        const cornerX = dims.centerX + dims.visualW / 2;
        const cornerY = dims.centerY + dims.visualH / 2;
        const worldPos = { x: cornerX, y: cornerY };

        console.log('DEBUG: Checking resize handle at position:', worldPos);
        console.log('DEBUG: Node dimensions:', dims);

        const hit = resizeHandler.findResizeHandle(worldPos);
        
        console.log('DEBUG: Resize handle hit result:', hit);

        // Este test debería pasar si el sistema está funcionando
        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
    });
});