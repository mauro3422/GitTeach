import { describe, it, expect } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';

describe('Minimal Repro', () => {
    it('should add a node', () => {
        const node = DesignerStore.addNode(false, 100, 100, { label: 'Test' });
        expect(node).toBeDefined();
        expect(node.id).toBeDefined();
        expect(DesignerStore.state.nodes[node.id]).toBeDefined();
    });
});
