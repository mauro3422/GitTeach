// Test resize: simulate changing box size and verify nodes stay within
import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import ContainerBoxManager from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

(async () => {
  console.log('\n=== RESIZE SIMULATION TEST ===\n');

  initializeContainers();

  // Set initial positions with nodes spread out
  LayoutEngine.positions = {};
  LayoutEngine.positions['workers_hub'] = { x: 500, y: 200, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_1'] = { x: 100, y: 100, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_2'] = { x: 200, y: 150, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_3'] = { x: 300, y: 250, vx: 0, vy: 0 };
  LayoutEngine.positions['embedding_server'] = { x: 400, y: 180, vx: 0, vy: 0 };

  console.log('Initial GPU cluster positions:');
  ['workers_hub', 'worker_1', 'worker_2', 'worker_3', 'embedding_server'].forEach(id => {
    const p = LayoutEngine.positions[id];
    console.log(`  ${id}: (${p.x}, ${p.y})`);
  });

  // Simulate initial box (medium size)
  console.log('\n[RESIZE] Setting initial box bounds...');
  const initialBounds = { minX: 50, minY: 50, maxX: 450, maxY: 300 };
  ContainerBoxManager.setBoxBounds('gpu_cluster', initialBounds);
  ContainerBoxManager.enforceAll();

  console.log('After initial enforcement:');
  ['workers_hub', 'worker_1', 'worker_2', 'worker_3', 'embedding_server'].forEach(id => {
    const p = LayoutEngine.positions[id];
    console.log(`  ${id}: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
  });

  // Simulate RESIZE: make box smaller
  console.log('\n[RESIZE] RESIZING box to SMALLER bounds...');
  const smallerBounds = { minX: 150, minY: 100, maxX: 350, maxY: 250 };
  ContainerBoxManager.setBoxBounds('gpu_cluster', smallerBounds);
  ContainerBoxManager.enforceAll();

  console.log('After resize to smaller box:');
  ['workers_hub', 'worker_1', 'worker_2', 'worker_3', 'embedding_server'].forEach(id => {
    const p = LayoutEngine.positions[id];
    console.log(`  ${id}: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
  });

  // Verify all within smaller bounds
  const allInSmaller = ['workers_hub', 'worker_1', 'worker_2', 'worker_3', 'embedding_server'].every(id => {
    const p = LayoutEngine.positions[id];
    return p.x >= smallerBounds.minX && p.x <= smallerBounds.maxX &&
      p.y >= smallerBounds.minY && p.y <= smallerBounds.maxY;
  });

  console.log(`All nodes within smaller box? ${allInSmaller ? 'YES' : 'NO'}`);

  // Simulate RESIZE: make box larger
  console.log('\n[RESIZE] RESIZING box to LARGER bounds...');
  const largerBounds = { minX: 0, minY: 0, maxX: 600, maxY: 400 };
  ContainerBoxManager.setBoxBounds('gpu_cluster', largerBounds);
  ContainerBoxManager.enforceAll();

  console.log('After resize to larger box:');
  ['workers_hub', 'worker_1', 'worker_2', 'worker_3', 'embedding_server'].forEach(id => {
    const p = LayoutEngine.positions[id];
    console.log(`  ${id}: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
  });

  // Verify all within larger bounds
  const allInLarger = ['workers_hub', 'worker_1', 'worker_2', 'worker_3', 'embedding_server'].every(id => {
    const p = LayoutEngine.positions[id];
    return p.x >= largerBounds.minX && p.x <= largerBounds.maxX &&
      p.y >= largerBounds.minY && p.y <= largerBounds.maxY;
  });

  console.log(`All nodes within larger box? ${allInLarger ? 'YES' : 'NO'}`);

  console.log(`\n=== RESIZE TEST RESULT: ${(allInSmaller && allInLarger) ? 'PASS' : 'FAIL'} ===\n`);
})();
