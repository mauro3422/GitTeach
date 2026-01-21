// Resize simulation with full system simulation and debug logging
import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import { ContainerBoxManager } from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

(async () => {
  console.log('\n=== FULL SYSTEM RESIZE SIMULATION ===\n');
  
  // 1. Initialize everything
  initializeContainers();
  console.log('[SYS-INIT] Containers:', Array.from(ContainerBoxManager.registry.keys()));

  // 2. Reset positions
  LayoutEngine.positions = {};
  
  // 3. Set GPU cluster nodes
  LayoutEngine.positions['workers_hub'] = { x: 100, y: 100, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_1'] = { x: 150, y: 60, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_2'] = { x: 800, y: 120, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_3'] = { x: 320, y: 260, vx: 0, vy: 0 };
  LayoutEngine.positions['embedding_server'] = { x: 200, y: 260, vx: 0, vy: 0 };

  console.log('[SYS-INIT] Initial GPU positions:', 
    ['workers_hub','worker_1','worker_2','worker_3','embedding_server'].map(id => 
      ({id, x: LayoutEngine.positions[id]?.x, y: LayoutEngine.positions[id]?.y})
    )
  );

  // 4. SIMULATE DRAWWING AND SETTING BOXES (like SectorRenderer does)
  console.log('\n[SYS-STEP 1] Simulating drawWorkerSector() - setting small box bounds...');
  const hubPos = LayoutEngine.getNodePos('workers_hub');
  const slot1Pos = LayoutEngine.getNodePos('worker_1');
  const slot3Pos = LayoutEngine.getNodePos('worker_3');
  const embPos = LayoutEngine.getNodePos('embedding_server');
  const extraWorker2 = LayoutEngine.getNodePos('worker_2');
  const allNodePos = [hubPos, slot1Pos, slot3Pos, embPos, extraWorker2].filter(p => !!p);
  
  const minX = Math.min(...allNodePos.map(p => p.x)) - 60;
  const maxX = Math.max(...allNodePos.map(p => p.x)) + 80;
  const minY = Math.min(...allNodePos.map(p => p.y)) - 60;
  const maxY = Math.max(...allNodePos.map(p => p.y)) + 60;

  console.log('[SYS-STEP 1] Calculated box bounds:', {minX, minY, maxX, maxY});

  if (typeof ContainerBoxManager?.setBoxBounds === 'function') {
    ContainerBoxManager.setBoxBounds('gpu_cluster', { minX, minY, maxX, maxY });
    console.log('[SYS-STEP 1] setBoxBounds() called for gpu_cluster');
  }

  // 5. Apply enforcement ONCE (like SectorRenderer does once per frame)
  console.log('\n[SYS-STEP 1] Applying enforcement for gpu_cluster...');
  if (typeof ContainerBoxManager?.enforceBox === 'function') {
    ContainerBoxManager.enforceBox('gpu_cluster', { minX, minY, maxX, maxY });
    console.log('[SYS-STEP 1] enforceBox() called for gpu_cluster');
  }

  const afterFirst = ['workers_hub','worker_1','worker_2','worker_3','embedding_server'].map(id => ({
    id, x: LayoutEngine.positions[id]?.x, y: LayoutEngine.positions[id]?.y
  }));
  console.log('[SYS-STEP 1] GPU after FIRST enforcement:', afterFirst);

  // 6. SIMULATE RESIZE (like user drags box edge)
  console.log('\n[SYS-STEP 2] SIMULATING RESIZE - box expanded to larger bounds...');
  const newMinX = 20, newMinY = 0, newMaxX = 1200, newMaxY = 400;
  console.log('[SYS-STEP 2] New larger box bounds:', {minX: newMinX, minY: newMinY, maxX: newMaxX, maxY: newMaxY});

  if (typeof ContainerBoxManager?.setBoxBounds === 'function') {
    ContainerBoxManager.setBoxBounds('gpu_cluster', { minX: newMinX, minY: newMinY, maxX: newMaxX, maxY: newMaxY });
    console.log('[SYS-STEP 2] setBoxBounds() called for gpu_cluster with NEW bounds');
  }

  console.log('[SYS-STEP 2] Applying enforcement again for gpu_cluster...');
  if (typeof ContainerBoxManager?.enforceBox === 'function') {
    ContainerBoxManager.enforceBox('gpu_cluster', { minX: newMinX, minY: newMinY, maxX: newMaxX, maxY: newMaxY });
    console.log('[SYS-STEP 2] enforceBox() called for gpu_cluster with NEW bounds');
  }

  const afterResize = ['workers_hub','worker_1','worker_2','worker_3','embedding_server'].map(id => ({
    id, x: LayoutEngine.positions[id]?.x, y: LayoutEngine.positions[id]?.y
  }));
  console.log('[SYS-STEP 2] GPU after RESIZE and enforcement:', afterResize);

  // 7. SIMULATE MULTIPLE FRAMES (like render loop)
  console.log('\n[SYS-STEP 3] Running 5 more frames of enforcement...');
  for (let i = 1; i <= 5; i++) {
    ContainerBoxManager.enforceBox('gpu_cluster', { minX: newMinX, minY: newMinY, maxX: newMaxX, maxY: newMaxY });
    console.log(`[SYS-STEP 3] Frame ${i}:`, ['workers_hub','worker_1','worker_2','worker_3','embedding_server'].map(id => ({
      id, x: LayoutEngine.positions[id]?.x, y: LayoutEngine.positions[id]?.y
    })));
  }

  // 8. Validate
  const gpuInBounds = afterResize.every(({x, y}) => x >= newMinX && x <= newMaxX && y >= newMinY && y <= newMaxY);
  console.log(`[SYS-VALIDATE] GPU cluster in large box: ${gpuInBounds ? 'YES' : 'NO'}`);

  // 9. Test CACHE
  console.log('\n[SYS-STEP 4] Testing CACHE resize...');
  LayoutEngine.positions['cache'] = { x: 300, y: 300, vx: 0, vy: 0 };
  console.log('[SYS-STEP 4] Initial cache position:', LayoutEngine.positions['cache']);

  // Small box
  const smallCacheBox = { minX: -40, minY: -40, maxX: 40, maxY: 40 };
  if (typeof ContainerBoxManager?.setBoxBounds === 'function') {
    ContainerBoxManager.setBoxBounds('cache_cluster', smallCacheBox);
    console.log('[SYS-STEP 4] setBoxBounds() called for cache_cluster with small box');
  }

  if (typeof ContainerBoxManager?.enforceBox === 'function') {
    ContainerBoxManager.enforceBox('cache_cluster', smallCacheBox);
    console.log('[SYS-STEP 4] enforceBox() called for cache_cluster with small box');
  }
  console.log('[SYS-STEP 4] Cache after small box:', LayoutEngine.positions['cache']);

  // Resize to large
  const largeCacheBox = { minX: -200, minY: -200, maxX: 200, maxY: 200 };
  if (typeof ContainerBoxManager?.setBoxBounds === 'function') {
    ContainerBoxManager.setBoxBounds('cache_cluster', largeCacheBox);
    console.log('[SYS-STEP 4] setBoxBounds() called for cache_cluster with large box');
  }

  if (typeof ContainerBoxManager?.enforceBox === 'function') {
    ContainerBoxManager.enforceBox('cache_cluster', largeCacheBox);
    console.log('[SYS-STEP 4] enforceBox() called for cache_cluster with large box');
  }
  console.log('[SYS-STEP 4] Cache after resize:', LayoutEngine.positions['cache']);

  // 10. Final validation
  console.log('\n[SYS-VALIDATE] Final results:');
  const cacheP = LayoutEngine.positions['cache'];
  const cacheInBounds = cacheP && cacheP.x >= largeCacheBox.minX && cacheP.x <= largeCacheBox.maxX && 
                        cacheP.y >= largeCacheBox.minY && cacheP.y <= largeCacheBox.maxY;
  console.log(`[SYS-VALIDATE] Cache in large box: ${cacheInBounds ? 'YES' : 'NO'}`);

  console.log(`\n=== FINAL RESULT: ${(gpuInBounds && cacheInBounds) ? 'PASS' : 'FAIL'} ===\n`);
})();
