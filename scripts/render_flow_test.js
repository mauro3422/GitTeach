// Test to simulate the actual render flow
import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import { ContainerBoxManager } from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

(async () => {
  console.log('\n=== RENDER FLOW SIMULATION TEST ===\n');

  // Initialize
  initializeContainers();

  // Simulate prepare() - physics update
  LayoutEngine.positions = {};
  LayoutEngine.positions['workers_hub'] = { x: 1000, y: 200, vx: 0, vy: 0 }; // Outside
  LayoutEngine.positions['worker_1'] = { x: 100, y: 100, vx: 0, vy: 0 };
  console.log('[RENDER] Initial positions:', LayoutEngine.positions);

  LayoutEngine.update(800, 600); // Simulate physics
  console.log('[RENDER] After physics update:', LayoutEngine.positions);

  // Simulate drawNodes() flow
  console.log('\n[RENDER] Simulating drawWorkerSector()...');

  // Get positions (like drawWorkerSector does)
  const hubPos = LayoutEngine.getNodePos('workers_hub');
  const slot1Pos = LayoutEngine.getNodePos('worker_1');
  const slot3Pos = LayoutEngine.getNodePos('worker_3');
  const embPos = LayoutEngine.getNodePos('embedding_server');
  const extraWorker2 = LayoutEngine.getNodePos('worker_2');

  // Calculate bounds (like drawWorkerSector does)
  const allNodePos = [hubPos, slot1Pos, slot3Pos, embPos, extraWorker2].filter(p => !!p);
  const minX = Math.min(...allNodePos.map(p => p.x)) - 60;
  const maxX = Math.max(...allNodePos.map(p => p.x)) + 80;
  const minY = Math.min(...allNodePos.map(p => p.y)) - 60;
  const maxY = Math.max(...allNodePos.map(p => p.y)) + 60;

  console.log(`[RENDER] Calculated GPU bounds: x:[${minX.toFixed(0)},${maxX.toFixed(0)}] y:[${minY.toFixed(0)},${maxY.toFixed(0)}]`);

  // Set bounds (like drawWorkerSector does)
  ContainerBoxManager.setBoxBounds('gpu_cluster', { minX, minY, maxX, maxY });
  console.log('[RENDER] setBoxBounds() called');

  // Simulate drawing more sectors...

  // Apply enforcement at end of drawNodes() (like our current implementation)
  console.log('\n[RENDER] Applying enforcement at end of drawNodes()...');
  ContainerBoxManager.enforceAll();
  console.log('[RENDER] After enforcement:', LayoutEngine.positions);

  // Check if within bounds
  const hubX = LayoutEngine.positions['workers_hub'].x;
  const hubY = LayoutEngine.positions['workers_hub'].y;
  const inBounds = hubX >= minX && hubX <= maxX && hubY >= minY && hubY <= maxY;
  console.log(`[RENDER] Hub in calculated bounds? ${inBounds} (x:${hubX.toFixed(0)}, y:${hubY.toFixed(0)})`);

  console.log('\n=== TEST RESULT:', inBounds ? 'PASS' : 'FAIL', '===\n');
})();
