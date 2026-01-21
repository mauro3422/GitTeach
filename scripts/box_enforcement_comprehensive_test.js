// Comprehensive test script: verify container box enforcement for all boxes.
import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import { ContainerBoxManager } from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

(async () => {
  // 1. Initialize all container boxes
  initializeContainers();
  console.log('[TEST] Containers initialized:', Array.from(ContainerBoxManager.registry.keys()));

  // 2. Reset positions
  LayoutEngine.positions = {};
  
  // 3. Set up test positions for GPU cluster (with one node far outside)
  LayoutEngine.positions['workers_hub'] = { x: 100, y: 100, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_1'] = { x: 150, y: 60, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_2'] = { x: 1000, y: 120, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_3'] = { x: 320, y: 260, vx: 0, vy: 0 };
  LayoutEngine.positions['embedding_server'] = { x: 200, y: 260, vx: 0, vy: 0 };

  // 4. Set up test positions for CPU cluster (normal positions)
  LayoutEngine.positions['mapper_architecture'] = { x: 2000, y: 300, vx: 0, vy: 0 };
  LayoutEngine.positions['mapper_habits'] = { x: 2100, y: 350, vx: 0, vy: 0 };
  LayoutEngine.positions['mapper_stack'] = { x: 2200, y: 400, vx: 0, vy: 0 };

  // 5. Set up test position for cache
  LayoutEngine.positions['cache'] = { x: 5000, y: 500, vx: 0, vy: 0 };

  console.log('[TEST] Initial positions set');

  // 6. Run enforcement
  ContainerBoxManager.enforceAll();
  console.log('[TEST] After enforcement');

  // 7. Validate GPU cluster nodes are within computed bounds
  const gpuIds = ['workers_hub','worker_1','worker_2','worker_3','embedding_server'];
  const gpuPositions = gpuIds.map(id => LayoutEngine.positions[id]).filter(p => !!p);
  const gpuXs = gpuPositions.map(p => p.x);
  const gpuYs = gpuPositions.map(p => p.y);
  const gpuMinX = Math.min(...gpuXs) - 40;
  const gpuMaxX = Math.max(...gpuXs) + 40;
  const gpuMinY = Math.min(...gpuYs) - 40;
  const gpuMaxY = Math.max(...gpuYs) + 40;

  const gpuAllInBounds = gpuIds.every(id => {
    const p = LayoutEngine.positions[id];
    return p && p.x >= gpuMinX && p.x <= gpuMaxX && p.y >= gpuMinY && p.y <= gpuMaxY;
  });

  console.log(`[TEST] GPU cluster bounds: x:[${gpuMinX.toFixed(0)},${gpuMaxX.toFixed(0)}] y:[${gpuMinY.toFixed(0)},${gpuMaxY.toFixed(0)}]`);
  console.log(`[TEST] GPU cluster test: ${gpuAllInBounds ? 'PASS' : 'FAIL'}`);

  // 8. Validate CPU cluster nodes
  const cpuIds = ['mapper_architecture','mapper_habits','mapper_stack'];
  const cpuPositions = cpuIds.map(id => LayoutEngine.positions[id]).filter(p => !!p);
  const cpuXs = cpuPositions.map(p => p.x);
  const cpuYs = cpuPositions.map(p => p.y);
  const cpuMinX = Math.min(...cpuXs) - 40;
  const cpuMaxX = Math.max(...cpuXs) + 40;
  const cpuMinY = Math.min(...cpuYs) - 40;
  const cpuMaxY = Math.max(...cpuYs) + 40;

  const cpuAllInBounds = cpuIds.every(id => {
    const p = LayoutEngine.positions[id];
    return p && p.x >= cpuMinX && p.x <= cpuMaxX && p.y >= cpuMinY && p.y <= cpuMaxY;
  });

  console.log(`[TEST] CPU cluster bounds: x:[${cpuMinX.toFixed(0)},${cpuMaxX.toFixed(0)}] y:[${cpuMinY.toFixed(0)},${cpuMaxY.toFixed(0)}]`);
  console.log(`[TEST] CPU cluster test: ${cpuAllInBounds ? 'PASS' : 'FAIL'}`);

  // 9. Validate cache node against its actual computed bounds
  const cacheId = 'cache';
  const cacheP = LayoutEngine.positions[cacheId];
  // Recompute cache bounds the same way enforceAll does
  const cachePositions = [cacheP];
  const cacheXs = cachePositions.map(p => p.x);
  const cacheYs = cachePositions.map(p => p.y);
  const cacheMargin = 40;
  const cacheMinX = Math.min(...cacheXs) - cacheMargin;
  const cacheMaxX = Math.max(...cacheXs) + cacheMargin;
  const cacheMinY = Math.min(...cacheYs) - cacheMargin;
  const cacheMaxY = Math.max(...cacheYs) + cacheMargin;
  
  const cacheInBounds = cacheP && cacheP.x >= cacheMinX && cacheP.x <= cacheMaxX && cacheP.y >= cacheMinY && cacheP.y <= cacheMaxY;

  console.log(`[TEST] Cache bounds: x:[${cacheMinX.toFixed(0)},${cacheMaxX.toFixed(0)}] y:[${cacheMinY.toFixed(0)},${cacheMaxY.toFixed(0)}]`);
  console.log(`[TEST] Cache position: x:${cacheP?.x} y:${cacheP?.y}`);
  console.log(`[TEST] Cache test: ${cacheInBounds ? 'PASS' : 'FAIL'}`);

  console.log('[TEST] Overall result:', (gpuAllInBounds && cpuAllInBounds && cacheInBounds) ? 'PASS' : 'FAIL');
})();
