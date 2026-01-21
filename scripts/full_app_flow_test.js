// Full app flow simulation: init -> draw system boxes -> create user box -> enforce
import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import { ContainerBoxManager } from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

(async () => {
  console.log('\n=== FULL APP FLOW SIMULATION ===\n');

  // 1. Initialize system (like PipelineCanvas.init)
  console.log('[APP-FLOW] Step 1: Initialize containers...');
  initializeContainers();

  // 2. Simulate PipelineRenderer.prepare (physics update)
  console.log('\n[APP-FLOW] Step 2: Physics update (no enforcement yet)...');
  LayoutEngine.positions = {};
  LayoutEngine.positions['workers_hub'] = { x: 100, y: 100, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_1'] = { x: 150, y: 60, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_2'] = { x: 800, y: 120, vx: 0, vy: 0 };
  LayoutEngine.positions['worker_3'] = { x: 320, y: 260, vx: 0, vy: 0 };
  LayoutEngine.positions['embedding_server'] = { x: 200, y: 260, vx: 0, vy: 0 };

  // Simulate physics (like LayoutEngine.update)
  LayoutEngine.update(800, 600);

  // 3. Simulate drawNodes() - draw system boxes and set their bounds
  console.log('\n[APP-FLOW] Step 3: Drawing system boxes and setting bounds...');

  // Simulate SectorRenderer.drawWorkerSector
  console.log('[APP-FLOW] Drawing GPU cluster...');
  const gpuPositions = ['workers_hub','worker_1','worker_2','worker_3','embedding_server']
    .map(id => LayoutEngine.getNodePos(id)).filter(p => !!p);
  const gpuXs = gpuPositions.map(p => p.x);
  const gpuYs = gpuPositions.map(p => p.y);
  const gpuBounds = {
    minX: Math.min(...gpuXs) - 60,
    maxX: Math.max(...gpuXs) + 80,
    minY: Math.min(...gpuYs) - 60,
    maxY: Math.max(...gpuYs) + 60
  };
  console.log('[APP-FLOW] GPU bounds calculated:', gpuBounds);

  // Set GPU bounds (like SectorRenderer does)
  if (typeof ContainerBoxManager?.setBoxBounds === 'function') {
    ContainerBoxManager.setBoxBounds('gpu_cluster', gpuBounds);
    console.log('[APP-FLOW] GPU bounds set in ContainerBoxManager');
  }

  // Simulate SectorRenderer.drawCpuSector
  console.log('[APP-FLOW] Drawing CPU cluster...');
  const cpuPositions = ['mapper_architecture','mapper_habits','mapper_stack']
    .map(id => LayoutEngine.getNodePos(id)).filter(p => !!p);
  const cpuBounds = cpuPositions.length ? {
    minX: Math.min(...cpuPositions.map(p => p.x)) - 80,
    maxX: Math.max(...cpuPositions.map(p => p.x)) + 80,
    minY: Math.min(...cpuPositions.map(p => p.y)) - 60,
    maxY: Math.max(...cpuPositions.map(p => p.y)) + 60
  } : { minX: -80, maxX: 80, minY: -60, maxY: 60 };

  if (typeof ContainerBoxManager?.setBoxBounds === 'function') {
    ContainerBoxManager.setBoxBounds('cpu_cluster', cpuBounds);
    console.log('[APP-FLOW] CPU bounds set in ContainerBoxManager');
  }

  // Simulate SectorRenderer.drawCacheContainer
  console.log('[APP-FLOW] Drawing Cache container...');
  const cachePos = LayoutEngine.getNodePos('cache');
  const cacheBounds = cachePos ? {
    minX: cachePos.x - 100,
    maxX: cachePos.x + 100,
    minY: cachePos.y - 50,
    maxY: cachePos.y + 50
  } : { minX: -100, maxX: 100, minY: -50, maxY: 50 };

  if (typeof ContainerBoxManager?.setBoxBounds === 'function') {
    ContainerBoxManager.setBoxBounds('cache_cluster', cacheBounds);
    console.log('[APP-FLOW] Cache bounds set in ContainerBoxManager');
  }

  // 4. Simulate user creating a dynamic box
  console.log('\n[APP-FLOW] Step 4: User creates dynamic box...');
  if (typeof ContainerBoxManager?.createUserBox === 'function') {
    ContainerBoxManager.createUserBox('user_box_1', { minX: 400, minY: 200, maxX: 600, maxY: 350 }, 30);
    console.log('[APP-FLOW] User box created');

    // Add some nodes to it
    ContainerBoxManager.addNodesToBox('user_box_1', ['workers_hub', 'worker_1']);
    console.log('[APP-FLOW] Nodes added to user box');
  }

  // 5. Apply enforcement at end of drawNodes (like PipelineRenderer does)
  console.log('\n[APP-FLOW] Step 5: Applying enforcement at end of drawNodes...');
  if (typeof ContainerBoxManager?.enforceAll === 'function') {
    console.debug('[PipelineRenderer] Calling ContainerBoxManager.enforceAll()');
    ContainerBoxManager.enforceAll();
    console.debug('[PipelineRenderer] enforceAll() completed');
  }

  // 6. Check results
  console.log('\n[APP-FLOW] Final positions after enforcement:');
  ['workers_hub','worker_1','worker_2','worker_3','embedding_server'].forEach(id => {
    const p = LayoutEngine.positions[id];
    if (p) console.log(`  ${id}: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
  });

  // Check if nodes in user box are within bounds
  const userBoxes = ContainerBoxManager.getUserBoxes();
  if (userBoxes.length > 0) {
    const userBox = userBoxes[0];
    console.log(`\n[APP-FLOW] User box bounds:`, userBox.bounds);

    const nodesInUserBox = ['workers_hub', 'worker_1'];
    const allInUserBox = nodesInUserBox.every(id => {
      const p = LayoutEngine.positions[id];
      return p && p.x >= userBox.bounds.minX && p.x <= userBox.bounds.maxX &&
             p.y >= userBox.bounds.minY && p.y <= userBox.bounds.maxY;
    });

    console.log(`[APP-FLOW] Nodes in user box within bounds? ${allInUserBox ? 'YES' : 'NO'}`);
  }

  console.log('\n[APP-FLOW] All registered boxes:', Array.from(ContainerBoxManager.registry.keys()));

  console.log('\n=== APP FLOW SIMULATION COMPLETE ===\n');
})();
