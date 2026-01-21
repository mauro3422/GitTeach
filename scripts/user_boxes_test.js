// Test dynamic user boxes API
import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import ContainerBoxManager from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

(async () => {
  console.log('\n=== DYNAMIC USER BOXES TEST ===\n');

  initializeContainers();

  // 1. Create a user box
  console.log('[USER-BOX] Creating user box "my_custom_group"...');
  ContainerBoxManager.createUserBox('my_custom_group', { minX: 100, minY: 100, maxX: 400, maxY: 300 }, 30);

  // 2. Add some nodes to it
  console.log('[USER-BOX] Adding nodes to box...');
  ContainerBoxManager.addNodesToBox('my_custom_group', ['workers_hub', 'worker_1']);

  // 3. Set positions (some outside box)
  LayoutEngine.positions = {};
  LayoutEngine.positions['workers_hub'] = { x: 500, y: 200, vx: 0, vy: 0 }; // Outside
  LayoutEngine.positions['worker_1'] = { x: 50, y: 150, vx: 0, vy: 0 }; // Outside

  console.log('Initial positions:');
  console.log('  workers_hub:', LayoutEngine.positions['workers_hub']);
  console.log('  worker_1:', LayoutEngine.positions['worker_1']);

  // 4. Apply enforcement (should move nodes into box)
  console.log('\n[USER-BOX] Applying enforcement...');
  ContainerBoxManager.enforceAll();

  console.log('After enforcement:');
  console.log('  workers_hub:', LayoutEngine.positions['workers_hub']);
  console.log('  worker_1:', LayoutEngine.positions['worker_1']);

  // 5. Resize the user box
  console.log('\n[USER-BOX] Resizing user box to smaller...');
  ContainerBoxManager.setBoxBounds('my_custom_group', { minX: 200, minY: 150, maxX: 350, maxY: 250 });

  ContainerBoxManager.enforceAll();

  console.log('After resize:');
  console.log('  workers_hub:', LayoutEngine.positions['workers_hub']);
  console.log('  worker_1:', LayoutEngine.positions['worker_1']);

  // 6. Add more nodes dynamically
  console.log('\n[USER-BOX] Adding worker_2 to box...');
  ContainerBoxManager.addNodesToBox('my_custom_group', ['worker_2']);
  LayoutEngine.positions['worker_2'] = { x: 600, y: 400, vx: 0, vy: 0 }; // Way outside

  ContainerBoxManager.enforceAll();

  console.log('After adding worker_2:');
  console.log('  workers_hub:', LayoutEngine.positions['workers_hub']);
  console.log('  worker_1:', LayoutEngine.positions['worker_1']);
  console.log('  worker_2:', LayoutEngine.positions['worker_2']);

  // 7. List user boxes
  const userBoxes = ContainerBoxManager.getUserBoxes();
  console.log('\n[USER-BOX] Current user boxes:', userBoxes);

  // 8. Verify all in bounds
  const boxBounds = userBoxes[0].bounds;
  const allInBounds = ['workers_hub', 'worker_1', 'worker_2'].every(id => {
    const p = LayoutEngine.positions[id];
    return p && p.x >= boxBounds.minX && p.x <= boxBounds.maxX &&
      p.y >= boxBounds.minY && p.y <= boxBounds.maxY;
  });

  console.log(`All nodes in user box bounds? ${allInBounds ? 'YES' : 'NO'}`);

  console.log(`\n=== USER BOXES TEST RESULT: ${allInBounds ? 'PASS' : 'FAIL'} ===\n`);
})();
