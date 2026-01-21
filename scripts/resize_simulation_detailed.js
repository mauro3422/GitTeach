// Resize simulation with detailed state logging
import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import { ContainerBoxManager } from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

(async () => {
  initializeContainers();
  console.log('\n=== RESIZE SIMULATION TEST ===\n');
  
  // 1. Reset positions
  LayoutEngine.positions = {};
  
  // 2. Set GPU cluster nodes (spread out)
  LayoutEngine.positions['workers_hub'] = { x: 100, y: 100, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_1'] = { x: 150, y: 60, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_2'] = { x: 800, y: 120, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_3'] = { x: 320, y: 260, vx: 0, vy: 0 };
  LayoutEngine.positions['embedding_server'] = { x: 200, y: 260, vx: 0, vy: 0 };

  console.log('INITIAL STATE - GPU cluster:');
  logNodePositions(['workers_hub','worker_1','worker_2','worker_3','embedding_server']);

  // 3. Apply small box bounds (tight container)
  console.log('\n[STEP 1] Applying SMALL box bounds...');
  const smallBox = { minX: 60, minY: 20, maxX: 1040, maxY: 300 };
  ContainerBoxManager.enforceBox('gpu_cluster', smallBox);
  console.log('After enforcement (SMALL box):');
  logNodePositions(['workers_hub','worker_1','worker_2','worker_3','embedding_server']);

  // 4. Simulate multiple frames of enforcement
  console.log('\n[STEP 2] Running 5 frames of enforcement on same box...');
  for (let i = 1; i <= 5; i++) {
    ContainerBoxManager.enforceBox('gpu_cluster', smallBox);
  }
  console.log(`After 5 frames of enforcement (SMALL box):`);
  logNodePositions(['workers_hub','worker_1','worker_2','worker_3','embedding_server']);

  // 5. Expand box significantly (simulate resize)
  console.log('\n[STEP 3] RESIZING box to LARGER bounds...');
  const largeBox = { minX: 20, minY: 0, maxX: 1200, maxY: 400 };
  ContainerBoxManager.enforceBox('gpu_cluster', largeBox);
  console.log('After enforcement (LARGE box):');
  logNodePositions(['workers_hub','worker_1','worker_2','worker_3','embedding_server']);

  // 6. Run 10 more frames with large box
  console.log('\n[STEP 4] Running 10 frames of enforcement (LARGE box)...');
  for (let i = 1; i <= 10; i++) {
    ContainerBoxManager.enforceBox('gpu_cluster', largeBox);
  }
  console.log('After 10 frames of enforcement (LARGE box):');
  logNodePositions(['workers_hub','worker_1','worker_2','worker_3','embedding_server']);

  // 7. Test CACHE with resize
  console.log('\n=== CACHE RESIZE TEST ===\n');
  LayoutEngine.positions['cache'] = { x: 300, y: 300, vx: 0, vy: 0 };
  console.log('Initial cache position:', LayoutEngine.positions['cache']);

  console.log('\n[STEP 5] Applying SMALL cache box...');
  const smallCacheBox = { minX: -40, minY: -40, maxX: 40, maxY: 40 };
  ContainerBoxManager.enforceBox('cache_cluster', smallCacheBox);
  console.log('After enforcement (SMALL cache box):', LayoutEngine.positions['cache']);

  console.log('\n[STEP 6] RESIZING cache box to LARGE bounds...');
  const largeCacheBox = { minX: -200, minY: -200, maxX: 200, maxY: 200 };
  ContainerBoxManager.enforceBox('cache_cluster', largeCacheBox);
  console.log('After enforcement (LARGE cache box):', LayoutEngine.positions['cache']);

  // 8. Run 5 frames with large cache box
  console.log('\n[STEP 7] Running 5 frames of enforcement (LARGE cache box)...');
  for (let i = 1; i <= 5; i++) {
    ContainerBoxManager.enforceBox('cache_cluster', largeCacheBox);
  }
  console.log('After 5 frames:', LayoutEngine.positions['cache']);

  // 9. Validate final states
  console.log('\n=== FINAL VALIDATION ===\n');
  const gpuIds = ['workers_hub','worker_1','worker_2','worker_3','embedding_server'];
  const gpuInBounds = gpuIds.every(id => {
    const p = LayoutEngine.positions[id];
    return p && p.x >= largeBox.minX && p.x <= largeBox.maxX && p.y >= largeBox.minY && p.y <= largeBox.maxY;
  });
  console.log(`GPU cluster in large box: ${gpuInBounds ? 'YES' : 'NO'}`);

  const cacheP = LayoutEngine.positions['cache'];
  const cacheInBounds = cacheP && cacheP.x >= largeCacheBox.minX && cacheP.x <= largeCacheBox.maxX && cacheP.y >= largeCacheBox.minY && cacheP.y <= largeCacheBox.maxY;
  console.log(`Cache in large box: ${cacheInBounds ? 'YES' : 'NO'}`);

  console.log(`\n=== OVERALL RESULT: ${(gpuInBounds && cacheInBounds) ? 'PASS' : 'FAIL'} ===\n`);

  function logNodePositions(ids) {
    ids.forEach(id => {
      const p = LayoutEngine.positions[id];
      if (p) {
        console.log(`  ${id.padEnd(20)} | x:${p.x.toFixed(0).padStart(6)} y:${p.y.toFixed(0).padStart(4)} v:(${p.vx?.toFixed(2)},${p.vy?.toFixed(2)})`);
      }
    });
  }
})();
