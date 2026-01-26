import { nodeRepository } from '../src/renderer/js/views/pipeline/designer/modules/stores/NodeRepository.js';
import { NodeFactory } from '../src/renderer/js/views/pipeline/designer/modules/NodeFactory.js';
import { ThemeManager } from '../src/renderer/js/core/ThemeManager.js';

try {
    console.log('Starting debug script...');
    console.log('ThemeManager instance creation...');
    const theme = ThemeManager.instance;
    console.log('Theme colors:', ThemeManager.colors ? 'OK' : 'FAIL');

    console.log('NodeFactory.createRegularNode call...');
    const node = NodeFactory.createRegularNode({ label: 'Test' });
    console.log('Node created:', node.id);

    console.log('nodeRepository.addNode call...');
    const nodeId = nodeRepository.addNode(false, 0, 0, { label: 'TestStore' });
    console.log('NodeId in repository:', nodeId);

} catch (e) {
    console.error('CRASH DETECTED:');
    console.error(e);
    process.exit(1);
}
