// Test complete user box workflow: create -> resize -> enforce
import { LayoutEngine } from '../src/renderer/js/views/pipeline/LayoutEngine.js';
import { ContainerBoxManager } from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

(async () => {
  console.log('\n=== COMPLETE USER BOX WORKFLOW TEST ===\n');

  // 1. Initialize system
  initializeContainers();

  // 2. Simulate creating a user box (like RoutingDesigner.addCustomNode)
  console.log('[WORKFLOW] Step 1: Creating user box...');
  const boxId = 'user_container_1';
  const centerX = 500, centerY = 300;
  const margin = 100;

  // Create box object (like in RoutingDesigner)
  const boxNode = {
    id: boxId,
    x: centerX,
    y: centerY,
    manualWidth: 200,
    manualHeight: 150,
    isRepoContainer: true,
    label: 'My Container'
  };

  // Register in ContainerBoxManager (like in RoutingDesigner)
  const initialBounds = {
    minX: centerX - margin,
    minY: centerY - margin,
    maxX: centerX + margin,
    maxY: centerY + margin
  };
  ContainerBoxManager.createUserBox(boxId, initialBounds, 40);

  // Add some nodes to the box
  ContainerBoxManager.addNodesToBox(boxId, ['node_a', 'node_b']);

  console.log('[WORKFLOW] User box created and registered');

  // 3. Set node positions (some outside initial box)
  LayoutEngine.positions = {};
  LayoutEngine.positions['node_a'] = { x: 450, y: 250, vx: 0, vy: 0 }; // Inside
  LayoutEngine.positions['node_b'] = { x: 650, y: 350, vx: 0, vy: 0 }; // Outside

  console.log('Initial node positions:');
  console.log('  node_a:', LayoutEngine.positions['node_a']);
  console.log('  node_b:', LayoutEngine.positions['node_b']);

  // 4. Apply initial enforcement
  console.log('\n[WORKFLOW] Step 2: Applying initial enforcement...');
  ContainerBoxManager.enforceAll();

  console.log('After initial enforcement:');
  console.log('  node_a:', LayoutEngine.positions['node_a']);
  console.log('  node_b:', LayoutEngine.positions['node_b']);

  // 5. Simulate resize (like DesignerInteraction resize)
  console.log('\n[WORKFLOW] Step 3: Resizing box to larger dimensions...');
  const newWidth = 400, newHeight = 300; // Larger box
  const resizedBounds = {
    minX: centerX - newWidth / 2,
    minY: centerY - newHeight / 2,
    maxX: centerX + newWidth / 2,
    maxY: centerY + newHeight / 2
  };

  // Update box bounds (like DesignerInteraction does during resize)
  ContainerBoxManager.setBoxBounds(boxId, resizedBounds);
  console.log('[WORKFLOW] Box bounds updated to:', resizedBounds);

  // Apply enforcement with new bounds
  ContainerBoxManager.enforceAll();

  console.log('After resize enforcement:');
  console.log('  node_a:', LayoutEngine.positions['node_a']);
  console.log('  node_b:', LayoutEngine.positions['node_b']);

  // 6. Simulate resize to smaller
  console.log('\n[WORKFLOW] Step 4: Resizing box to smaller dimensions...');
  const smallWidth = 150, smallHeight = 100;
  const smallBounds = {
    minX: centerX - smallWidth / 2,
    minY: centerY - smallHeight / 2,
    maxX: centerX + smallWidth / 2,
    maxY: centerY + smallHeight / 2
  };

  ContainerBoxManager.setBoxBounds(boxId, smallBounds);
  console.log('[WORKFLOW] Box bounds updated to smaller:', smallBounds);

  ContainerBoxManager.enforceAll();

  console.log('After small resize enforcement:');
  console.log('  node_a:', LayoutEngine.positions['node_a']);
  console.log('  node_b:', LayoutEngine.positions['node_b']);

  // 7. Verify final positions are within small bounds
  const nodeA_InBounds = LayoutEngine.positions['node_a'].x >= smallBounds.minX &&
                        LayoutEngine.positions['node_a'].x <= smallBounds.maxX &&
                        LayoutEngine.positions['node_a'].y >= smallBounds.minY &&
                        LayoutEngine.positions['node_a'].y <= smallBounds.maxY;

  const nodeB_InBounds = LayoutEngine.positions['node_b'].x >= smallBounds.minX &&
                        LayoutEngine.positions['node_b'].x <= smallBounds.maxX &&
                        LayoutEngine.positions['node_b'].y >= smallBounds.minY &&
                        LayoutEngine.positions['node_b'].y <= smallBounds.maxY;

  console.log('\n[WORKFLOW] Final verification:');
  console.log(`  node_a in small bounds: ${nodeA_InBounds}`);
  console.log(`  node_b in small bounds: ${nodeB_InBounds}`);

  console.log(`\n=== WORKFLOW TEST RESULT: ${(nodeA_InBounds && nodeB_InBounds) ? 'PASS' : 'FAIL'} ===\n`);
})();
