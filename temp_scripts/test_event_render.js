/**
 * Test para verificar que el sistema de eventos de renderizado funciona correctamente
 * Ejecutar con: node temp_scripts/test_event_render.js
 */

import { globalEventBus } from '../src/renderer/js/core/EventBus.js';

// Mock RoutingDesigner para pruebas
let renderCallCount = 0;
const mockRoutingDesigner = {
    render: () => {
        renderCallCount++;
        console.log(`🎨 Render called ${renderCallCount} times`);
        return true;
    }
};

// Simular la suscripción que hace RoutingDesigner
console.log('🧪 Testing Event-Driven Rendering...');

// Simular la suscripción (como hace RoutingDesigner en mount())
const unsubscribe = globalEventBus.on('designer:render:request', () => {
    mockRoutingDesigner.render();
});

console.log('✅ Event listener subscribed');

// Simular eventos de renderizado (como los que emiten ModalManager, ContainerRenderer, etc.)
console.log('\n📡 Emitting render events...');

globalEventBus.emit('designer:render:request');
globalEventBus.emit('designer:render:request');
globalEventBus.emit('designer:render:request');

// Limpiar suscripción (como hace RoutingDesigner en destroy())
unsubscribe();

console.log('\n🧹 Event listener unsubscribed');

// Verificar que no se recibe más eventos después de desuscribir
globalEventBus.emit('designer:render:request');

console.log(`\n📊 Final render call count: ${renderCallCount}`);
console.log('✅ Expected: 3 calls (received events before unsubscribe)');

if (renderCallCount === 3) {
    console.log('🎉 Event-driven rendering test PASSED!');
} else {
    console.log('❌ Event-driven rendering test FAILED!');
}
