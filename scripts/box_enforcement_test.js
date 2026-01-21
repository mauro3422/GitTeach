// Simple test script: verify that the BoxManager enforces nodes inside a container when resizing.
// This script is meant to run in Node (ESM) and uses the same modules as the app.

import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import ContainerBoxManager from '../src/renderer/js/utils/ContainerBoxManager.js';

(async () => {
  // Reset positions
  LayoutEngine.positions = {};
  // Create 5 nodes for GPU cluster with some values outside a hypothetical box
  LayoutEngine.positions['workers_hub'] = { x: 100, y: 100, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_1'] = { x: 150, y: 60, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_2'] = { x: 1000, y: 120, vx: 0, vy: 0 }; // outside to be brought in
  LayoutEngine.positions['worker_3'] = { x: 320, y: 260, vx: 0, vy: 0 };
  LayoutEngine.positions['embedding_server'] = { x: 200, y: 260, vx: 0, vy: 0 };

  const minX = -60, minY = -60, maxX = 700, maxY = 420;
  ContainerBoxManager.registerBox('gpu_cluster', ['workers_hub','worker_1','worker_2','worker_3','embedding_server'], 40);
  ContainerBoxManager.enforceAll();

  // Validate all nodes now lie within bounds
  const ids = ['workers_hub','worker_1','worker_2','worker_3','embedding_server'];
  const inBounds = ids.every(id => {
    const p = LayoutEngine.positions[id];
    return p && p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
  });

  console.log(`[TEST] Box enforcement test result: ${inBounds ? 'PASS' : 'FAIL'}`);
})();
