// Test that simulates container resize and verifies nodes stay within
import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import { ContainerBoxManager } from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

(async () => {
  // 1. Initialize
  initializeContainers();
  console.log('[RESIZE-TEST] Containers:', Array.from(ContainerBoxManager.registry.keys()));

  // 2. Reset positions
  LayoutEngine.positions = {};

  // 3. Set GPU cluster nodes - some outside box
  LayoutEngine.positions['workers_hub'] = { x: 100, y: 100, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_1'] = { x: 150, y: 60, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_2'] = { x: 1000, y: 120, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_3'] = { x: 320, y: 260, vx: 0, vy: 0 };
  LayoutEngine.positions['embedding_server'] = { x: 200, y: 260, vx: 0, vy: 0 };

  console.log('[RESIZE-TEST] Initial GPU positions:', ['workers_hub','worker_1','worker_2','worker_3','embedding_server'].map(id => ({id, x: LayoutEngine.positions[id]?.x, y: LayoutEngine.positions[id]?.y})));

  // 4. INITIAL BOX SIZE (small box)
  let gpuBox = { minX: 60, minY: 20, maxX: 1040, maxY: 300 };
  ContainerBoxManager.enforceBox('gpu_cluster', gpuBox);

  const gpuAfterInitial = ['workers_hub','worker_1','worker_2','worker_3','embedding_server'].map(id => ({id, x: LayoutEngine.positions[id]?.x, y: LayoutEngine.positions[id]?.y}));
  console.log('[RESIZE-TEST] GPU after SMALL box enforcement:', gpuAfterInitial);

  // 5. RESIZE BOX (larger box - simulate user dragging container edge)
  console.log('[RESIZE-TEST] ================= RESIZING GPU BOX (larger) =================');
  gpuBox = { minX: 20, minY: 0, maxX: 1200, maxY: 400 };
  ContainerBoxManager.enforceBox('gpu_cluster', gpuBox);

  const gpuAfterResize = ['workers_hub','worker_1','worker_2','worker_3','embedding_server'].map(id => ({id, x: LayoutEngine.positions[id]?.x, y: LayoutEngine.positions[id]?.y}));
  console.log('[RESIZE-TEST] GPU after LARGE box enforcement:', gpuAfterResize);

  // 6. Verify all within new bounds
  const gpuInBounds = gpuAfterResize.every(({x, y}) => x >= gpuBox.minX && x <= gpuBox.maxX && y >= gpuBox.minY && y <= gpuBox.maxY);
  console.log(`[RESIZE-TEST] GPU resize test: ${gpuInBounds ? 'PASS' : 'FAIL'}`);

  // 7. Test CACHE with resize
  LayoutEngine.positions['cache'] = { x: 500, y: 500, vx: 0, vy: 0 };
  console.log('[RESIZE-TEST] Initial cache position:', {x: LayoutEngine.positions['cache'].x, y: LayoutEngine.positions['cache'].y});

  // Small cache box
  let cacheBox = { minX: -40, minY: -40, maxX: 40, maxY: 40 };
  ContainerBoxManager.enforceBox('cache_cluster', cacheBox);
  console.log('[RESIZE-TEST] Cache after SMALL box:', {x: LayoutEngine.positions['cache'].x, y: LayoutEngine.positions['cache'].y});

  // Larger cache box (resize)
  console.log('[RESIZE-TEST] ================= RESIZING CACHE BOX (larger) =================');
  cacheBox = { minX: -200, minY: -200, maxX: 200, maxY: 200 };
  ContainerBoxManager.enforceBox('cache_cluster', cacheBox);
  const cacheAfterResize = {x: LayoutEngine.positions['cache'].x, y: LayoutEngine.positions['cache'].y};
  console.log('[RESIZE-TEST] Cache after LARGE box:', cacheAfterResize);

  const cacheInBounds = cacheAfterResize.x >= cacheBox.minX && cacheAfterResize.x <= cacheBox.maxX && cacheAfterResize.y >= cacheBox.minY && cacheAfterResize.y <= cacheBox.maxY;
  console.log(`[RESIZE-TEST] Cache resize test: ${cacheInBounds ? 'PASS' : 'FAIL'}`);

  console.log('[RESIZE-TEST] Overall:', (gpuInBounds && cacheInBounds) ? 'PASS' : 'FAIL');
})();
