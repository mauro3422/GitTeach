// tests/multi_node_resize_test.test.js
// Test para reproducir el problema de redimensionamiento con múltiples nodos

// Importar solo módulos del proyecto, no funciones de Vitest
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

describe('Multi-Node Resize Behavior Test', () => {
    let canvas;
    let resizeHandler;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.id = 'designer-canvas';
        canvas.width = 1920;
        canvas.height = 1080;
        document.body.appendChild(canvas);

        const container = document.createElement('div');
        container.id = 'designer-container';
        document.body.appendChild(container);

        DesignerStore.setState({ 
            nodes: {}, 
            connections: [],
            navigation: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 },
            interaction: { hoveredNodeId: null, selectedNodeId: null, selectedConnectionId: null, draggingNodeId: null, resizingNodeId: null }
        });
        
        DesignerInteraction.init(canvas, () => DesignerStore.state.nodes, () => { });
        resizeHandler = new ResizeHandler(DesignerInteraction);
    });

    it('should handle resize for multiple sticky notes correctly', () => {
        // Crear varios sticky notes
        const sticky1 = {
            id: 'sticky-1',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Sticky 1',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        
        const sticky2 = {
            id: 'sticky-2',
            x: 300,
            y: 0,
            isStickyNote: true,
            text: 'Another sticky note with more text',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        
        const sticky3 = {
            id: 'sticky-3',
            x: 600,
            y: 0,
            isStickyNote: true,
            text: 'Short',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes = { 
            [sticky1.id]: sticky1, 
            [sticky2.id]: sticky2, 
            [sticky3.id]: sticky3 
        };

        // Probar detección de handles para cada sticky note
        const bounds1 = GeometryUtils.getStickyNoteBounds(sticky1, null, 1.0);
        const cornerX1 = bounds1.centerX + bounds1.renderW / 2;
        const cornerY1 = bounds1.centerY + bounds1.renderH / 2;
        const hit1 = resizeHandler.findResizeHandle({ x: cornerX1, y: cornerY1 });

        expect(hit1).not.toBeNull();
        expect(hit1.nodeId).toBe(sticky1.id);

        const bounds2 = GeometryUtils.getStickyNoteBounds(sticky2, null, 1.0);
        const cornerX2 = bounds2.centerX + bounds2.renderW / 2;
        const cornerY2 = bounds2.centerY + bounds2.renderH / 2;
        const hit2 = resizeHandler.findResizeHandle({ x: cornerX2, y: cornerY2 });

        expect(hit2).not.toBeNull();
        expect(hit2.nodeId).toBe(sticky2.id);

        const bounds3 = GeometryUtils.getStickyNoteBounds(sticky3, null, 1.0);
        const cornerX3 = bounds3.centerX + bounds3.renderW / 2;
        const cornerY3 = bounds3.centerY + bounds3.renderH / 2;
        const hit3 = resizeHandler.findResizeHandle({ x: cornerX3, y: cornerY3 });

        expect(hit3).not.toBeNull();
        expect(hit3.nodeId).toBe(sticky3.id);
    });

    it('should handle resize for mixed node types correctly', () => {
        // Crear un contenedor y varios sticky notes
        const container = {
            id: 'container-1',
            x: -200,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };
        
        const sticky1 = {
            id: 'mixed-sticky-1',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Mixed sticky 1',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        
        const sticky2 = {
            id: 'mixed-sticky-2',
            x: 300,
            y: 0,
            isStickyNote: true,
            text: 'Mixed sticky 2 with longer text',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes = { 
            [container.id]: container, 
            [sticky1.id]: sticky1, 
            [sticky2.id]: sticky2 
        };

        // Probar detección de handles para el contenedor
        const containerBounds = GeometryUtils.getContainerBounds(container, DesignerStore.state.nodes, 1.0);
        const containerCornerX = containerBounds.centerX + containerBounds.renderW / 2;
        const containerCornerY = containerBounds.centerY + containerBounds.renderH / 2;
        const containerHit = resizeHandler.findResizeHandle({ x: containerCornerX, y: containerCornerY });

        expect(containerHit).not.toBeNull();
        expect(containerHit.nodeId).toBe(container.id);

        // Probar detección de handles para sticky notes
        const sticky1Bounds = GeometryUtils.getStickyNoteBounds(sticky1, null, 1.0);
        const sticky1CornerX = sticky1Bounds.centerX + sticky1Bounds.renderW / 2;
        const sticky1CornerY = sticky1Bounds.centerY + sticky1Bounds.renderH / 2;
        const sticky1Hit = resizeHandler.findResizeHandle({ x: sticky1CornerX, y: sticky1CornerY });

        expect(sticky1Hit).not.toBeNull();
        expect(sticky1Hit.nodeId).toBe(sticky1.id);

        const sticky2Bounds = GeometryUtils.getStickyNoteBounds(sticky2, null, 1.0);
        const sticky2CornerX = sticky2Bounds.centerX + sticky2Bounds.renderW / 2;
        const sticky2CornerY = sticky2Bounds.centerY + sticky2Bounds.renderH / 2;
        const sticky2Hit = resizeHandler.findResizeHandle({ x: sticky2CornerX, y: sticky2CornerY });

        expect(sticky2Hit).not.toBeNull();
        expect(sticky2Hit.nodeId).toBe(sticky2.id);
    });

    it('should maintain resize functionality after adding multiple nodes', () => {
        // Agregar nodos uno por uno y verificar que el resize sigue funcionando
        const initialSticky = {
            id: 'initial-sticky',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Initial',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[initialSticky.id] = initialSticky;

        // Verificar que el resize funciona para el primer nodo
        const initialBounds = GeometryUtils.getStickyNoteBounds(initialSticky, null, 1.0);
        const initialCornerX = initialBounds.centerX + initialBounds.renderW / 2;
        const initialCornerY = initialBounds.centerY + initialBounds.renderH / 2;
        const initialHit = resizeHandler.findResizeHandle({ x: initialCornerX, y: initialCornerY });

        expect(initialHit).not.toBeNull();
        expect(initialHit.nodeId).toBe(initialSticky.id);

        // Agregar un contenedor
        const container = {
            id: 'added-container',
            x: 300,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };

        DesignerStore.state.nodes[container.id] = container;

        // Verificar que ambos nodos aún pueden ser redimensionados
        const containerBounds = GeometryUtils.getContainerBounds(container, DesignerStore.state.nodes, 1.0);
        const containerCornerX = containerBounds.centerX + containerBounds.renderW / 2;
        const containerCornerY = containerBounds.centerY + containerBounds.renderH / 2;
        const containerHit = resizeHandler.findResizeHandle({ x: containerCornerX, y: containerCornerY });

        expect(containerHit).not.toBeNull();
        expect(containerHit.nodeId).toBe(container.id);

        // Verificar que el primer nodo aún puede ser redimensionado
        const finalInitialHit = resizeHandler.findResizeHandle({ x: initialCornerX, y: initialCornerY });
        expect(finalInitialHit).not.toBeNull();
        expect(finalInitialHit.nodeId).toBe(initialSticky.id);
    });

    it('should handle resize operations correctly for multiple nodes', () => {
        const sticky1 = {
            id: 'operation-sticky-1',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Operation test 1',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        
        const sticky2 = {
            id: 'operation-sticky-2',
            x: 300,
            y: 0,
            isStickyNote: true,
            text: 'Operation test 2',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes = { [sticky1.id]: sticky1, [sticky2.id]: sticky2 };

        // Iniciar resize para el primer sticky
        const bounds1 = GeometryUtils.getStickyNoteBounds(sticky1, null, 1.0);
        const cornerX1 = bounds1.centerX + bounds1.renderW / 2;
        const cornerY1 = bounds1.centerY + bounds1.renderH / 2;
        
        const hit1 = resizeHandler.findResizeHandle({ x: cornerX1, y: cornerY1 });
        expect(hit1).not.toBeNull();
        
        // Iniciar operación de resize
        resizeHandler.onStart(null, { 
            nodeId: hit1.nodeId, 
            corner: hit1.corner, 
            initialPos: { x: cornerX1, y: cornerY1 } 
        });

        // Verificar que el estado de resize está activo
        const state = resizeHandler.getState();
        expect(state.resizingNodeId).toBe(sticky1.id);

        // Simular actualización de resize
        const newPos = { x: cornerX1 + 20, y: cornerY1 + 20 };
        const mockEvent = { clientX: newPos.x, clientY: newPos.y };
        
        // Mock para las funciones de coordenadas
        vi.spyOn(DesignerInteraction, 'getMousePos').mockReturnValue(newPos);
        vi.spyOn(DesignerInteraction, 'screenToWorld').mockReturnValue(newPos);
        
        resizeHandler.onUpdate(mockEvent);

        // Verificar que las dimensiones han cambiado
        expect(sticky1.dimensions.w).toBeGreaterThan(180);
        expect(sticky1.dimensions.h).toBeGreaterThan(100);

        // Terminar la operación
        resizeHandler.onEnd(null);
    });
});