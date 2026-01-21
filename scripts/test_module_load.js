// Quick test to verify ContainerBoxManager loads correctly
import ContainerBoxManager from '../src/renderer/js/utils/ContainerBoxManager.js';
import { initializeContainers } from '../src/renderer/js/utils/initializeContainers.js';

console.log('Testing ContainerBoxManager load...');

try {
  await ContainerBoxManager.init(); // Initialize LayoutEngine
  await initializeContainers();
  console.log('✅ ContainerBoxManager loaded successfully');
  console.log('Registry size:', ContainerBoxManager.registry.size);
  console.log('Available methods:', Object.getOwnPropertyNames(ContainerBoxManager).filter(name => typeof ContainerBoxManager[name] === 'function'));
} catch (error) {
  console.error('❌ Error loading ContainerBoxManager:', error);
}