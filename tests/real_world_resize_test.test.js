// tests/real_world_resize_test.test.js
// Test para verificar el comportamiento real del sistema de redimensionamiento

import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

describe('Real World Resize System Test', () => {
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
            camera: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 },
            interaction: { hoveredNodeId: null, selectedNodeId: null, selectedConnectionId: null, draggingNodeId: null, resizingNodeId: null }
        });

        DesignerInteraction.init(canvas, () => DesignerStore.state.nodes, () => { });
        DesignerInteraction.panZoomHandler.setState({ panOffset: { x: 0, y: 0 }, zoomScale: 1.0 });
        resizeHandler = new ResizeHandler(DesignerInteraction);
    });

    it('should work correctly for typical designer workflow - sticky note with text', () => {
        // Crear un sticky note como lo haría un usuario real
        const stickyNote = {
            id: 'user-created-sticky',
            x: 100,
            y: 100,
            isStickyNote: true,
            text: 'Important note with some content',
            dimensions: { w: 200, h: 120, isManual: true }
        };

        DesignerStore.setState({ nodes: { [stickyNote.id]: stickyNote } });

        // Simular el proceso real: usuario mueve el mouse cerca del borde derecho inferior
        // Calcular la posición de la esquina SE usando el sistema de bounds visuales
        const bounds = GeometryUtils.getStickyNoteBounds(stickyNote, null, 1.0);
        const cornerX = bounds.centerX + bounds.renderW / 2;
        const cornerY = bounds.centerY + bounds.renderH / 2;

        // Este es el punto donde el usuario haría clic para redimensionar
        const mouseWorldPos = { x: cornerX, y: cornerY };

        // Verificar que el sistema detecte el handle de redimensionamiento
        const handleHit = resizeHandler.findResizeHandle(mouseWorldPos);

        expect(handleHit).not.toBeNull();
        expect(handleHit.nodeId).toBe(stickyNote.id);
        expect(handleHit.corner).toBe('se'); // southeast corner
    });

    it('should work correctly for typical designer workflow - container', () => {
        // Crear un contenedor como lo haría un usuario real
        const container = {
            id: 'user-created-container',
            x: 0,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 250, h: 180, isManual: true }
        };

        DesignerStore.setState({ nodes: { [container.id]: container } });

        // Calcular la posición de la esquina SE usando el sistema de bounds visuales
        const bounds = GeometryUtils.getContainerBounds(container, DesignerStore.state.nodes, 1.0);
        const cornerX = bounds.centerX + bounds.renderW / 2;
        const cornerY = bounds.centerY + bounds.renderH / 2;

        // Este es el punto donde el usuario haría clic para redimensionar
        const mouseWorldPos = { x: cornerX, y: cornerY };

        // Verificar que el sistema detecte el handle de redimensionamiento
        const handleHit = resizeHandler.findResizeHandle(mouseWorldPos);

        expect(handleHit).not.toBeNull();
        expect(handleHit.nodeId).toBe(container.id);
        expect(handleHit.corner).toBe('se'); // southeast corner
    });

    it('should handle zoom level changes correctly', () => {
        const stickyNote = {
            id: 'zoom-test-sticky',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Zoom test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.setState({ nodes: { [stickyNote.id]: stickyNote } });

        // Probar en zoom normal (1.0x)
        DesignerInteraction.panZoomHandler.setState({ panOffset: { x: 0, y: 0 }, zoomScale: 1.0 });
        const boundsNormal = GeometryUtils.getStickyNoteBounds(stickyNote, null, 1.0);
        const cornerXNormal = boundsNormal.centerX + boundsNormal.renderW / 2;
        const cornerYNormal = boundsNormal.centerY + boundsNormal.renderH / 2;
        const hitNormal = resizeHandler.findResizeHandle({ x: cornerXNormal, y: cornerYNormal });

        expect(hitNormal).not.toBeNull();
        expect(hitNormal.nodeId).toBe(stickyNote.id);

        // Probar en zoom bajo (0.5x)
        DesignerInteraction.panZoomHandler.setState({ panOffset: { x: 0, y: 0 }, zoomScale: 0.5 });
        const boundsLow = GeometryUtils.getStickyNoteBounds(stickyNote, null, 0.5);
        const cornerXLow = boundsLow.centerX + boundsLow.renderW / 2;
        const cornerYLow = boundsLow.centerY + boundsLow.renderH / 2;
        const hitLow = resizeHandler.findResizeHandle({ x: cornerXLow, y: cornerYLow });

        expect(hitLow).not.toBeNull();
        expect(hitLow.nodeId).toBe(stickyNote.id);

        // Probar en zoom alto (2.0x)
        DesignerInteraction.panZoomHandler.setState({ panOffset: { x: 0, y: 0 }, zoomScale: 2.0 });
        const boundsHigh = GeometryUtils.getStickyNoteBounds(stickyNote, null, 2.0);
        const cornerXHigh = boundsHigh.centerX + boundsHigh.renderW / 2;
        const cornerYHigh = boundsHigh.centerY + boundsHigh.renderH / 2;
        const hitHigh = resizeHandler.findResizeHandle({ x: cornerXHigh, y: cornerYHigh });

        expect(hitHigh).not.toBeNull();
        expect(hitHigh.nodeId).toBe(stickyNote.id);
    });

    it('should work with different text lengths affecting visual dimensions', () => {
        const shortTextSticky = {
            id: 'short-text',
            x: -100,
            y: 0,
            isStickyNote: true,
            text: 'Short',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        const longTextSticky = {
            id: 'long-text',
            x: 100,
            y: 0,
            isStickyNote: true,
            text: 'This is a very long text that should result in wider visual dimensions compared to the short text sticky note',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.setState({
            nodes: {
                [shortTextSticky.id]: shortTextSticky,
                [longTextSticky.id]: longTextSticky
            }
        });

        // Obtener los bounds visuales para ambos sticky notes
        const shortBounds = GeometryUtils.getStickyNoteBounds(shortTextSticky, null, 1.0);
        const longBounds = GeometryUtils.getStickyNoteBounds(longTextSticky, null, 1.0);

        // El sticky note con texto largo debería tener dimensiones visuales más anchas
        expect(longBounds.renderW).toBeGreaterThanOrEqual(shortBounds.renderW);

        // Calcular las posiciones de las esquinas SE basadas en dimensiones visuales
        const shortCornerX = shortBounds.centerX + shortBounds.renderW / 2;
        const shortCornerY = shortBounds.centerY + shortBounds.renderH / 2;
        const longCornerX = longBounds.centerX + longBounds.renderW / 2;
        const longCornerY = longBounds.centerY + longBounds.renderH / 2;

        // Ambos deberían detectar handles correctamente en sus posiciones visuales
        const shortHit = resizeHandler.findResizeHandle({ x: shortCornerX, y: shortCornerY });
        const longHit = resizeHandler.findResizeHandle({ x: longCornerX, y: longCornerY });

        expect(shortHit).not.toBeNull();
        expect(shortHit.nodeId).toBe(shortTextSticky.id);
        expect(longHit).not.toBeNull();
        expect(longHit.nodeId).toBe(longTextSticky.id);
    });
});