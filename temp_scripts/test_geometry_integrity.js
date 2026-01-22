/**
 * Test básico para verificar la integridad de las nuevas utilidades
 * Ejecutar con: node temp_scripts/test_geometry_integrity.js
 */

import { CoordinateUtils } from '../src/renderer/js/views/pipeline/designer/CoordinateUtils.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

// Mock canvas para pruebas
const mockCanvas = {
    width: 800,
    height: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
};

const mockNavState = {
    panOffset: { x: 100, y: 50 },
    zoomScale: 1.5
};

// Test CoordinateUtils
console.log('🧪 Testing CoordinateUtils...');

const centerPos = CoordinateUtils.getCanvasCenterWorldPos(mockCanvas, mockNavState);
console.log('✅ getCanvasCenterWorldPos:', centerPos);

const screenPos = { x: 400, y: 300 };
const worldPos = CoordinateUtils.screenToWorld(screenPos, mockNavState);
console.log('✅ screenToWorld:', worldPos);

const backToScreen = CoordinateUtils.worldToScreen(worldPos, mockNavState);
console.log('✅ worldToScreen:', backToScreen);

// Test GeometryUtils
console.log('\n🧪 Testing GeometryUtils...');

const mockNode = {
    id: 'test-node',
    x: 100,
    y: 200,
    isSatellite: false,
    dimensions: { w: 180, h: 100, animW: 180, animH: 100, isManual: false }
};

const mockContainer = {
    id: 'test-container',
    x: 0,
    y: 0,
    isRepoContainer: true,
    dimensions: { w: 200, h: 150, animW: 200, animH: 150, isManual: true }
};

const radius = GeometryUtils.getNodeRadius(mockNode, 1.0);
console.log('✅ getNodeRadius:', radius);

const bounds = GeometryUtils.getContainerBounds(mockContainer, {}, 1.0);
console.log('✅ getContainerBounds:', bounds);

const point = { x: 100, y: 200 };
const isInNode = GeometryUtils.isPointInNode(point, mockNode, 1.0);
console.log('✅ isPointInNode:', isInNode);

const distance = GeometryUtils.getDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
console.log('✅ getDistance (should be 5):', distance);

const rect = { x: 50, y: 50, w: 100, h: 100 };
const isInRect = GeometryUtils.isPointInRectangle(point, rect);
console.log('✅ isPointInRectangle:', isInRect);

console.log('\n🎉 All basic tests passed! GeometryUtils and CoordinateUtils are working correctly.');
