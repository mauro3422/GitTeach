import { NodeManager } from './modules/NodeManager.js';
import { ConnectionManager } from './modules/ConnectionManager.js';
import { BlueprintManager } from './BlueprintManager.js';
import { DesignerStore } from './modules/DesignerStore.js';
import ContainerBoxManager from '../../../utils/ContainerBoxManager.js';

export const RoutingDesignerStateLoader = {
    /**
     * Carga y hidrata el estado desde LocalStorage/File System
     */
    async loadAndHydrate() {
        // Load Initial State
        NodeManager.loadInitialNodes();

        // MERGE with File System / LocalStorage if exists
        const savedState = await BlueprintManager.loadFromLocalStorage();
        if (savedState && savedState.layout) {
            const scale = 1200;
            Object.entries(savedState.layout).forEach(([id, data]) => {
                this.hydrateNode(id, data, scale);
            });
            ConnectionManager.setConnections(Array.isArray(savedState.connections) ? savedState.connections : []);

            // Final notify after all hydration is done
            DesignerStore.notify();
        }
    },

    /**
     * Hidrata un nodo individual desde el estado guardado
     */
    hydrateNode(id, data, scale) {
        let node = NodeManager.getNode(id);

        if (!node) {
            // Create custom/lost nodes
            node = {
                id,
                x: data.x * scale,
                y: data.y * scale,
                label: data.label,
                message: data.message,
                parentId: data.parentId,
                icon: data.isStickyNote ? '📝' : (data.isRepoContainer ? '📦' : '🧩'),
                color: data.color || '#30363d',
                isRepoContainer: data.isRepoContainer,
                isStickyNote: data.isStickyNote,
                text: data.text,
                isSatellite: data.isSatellite,
                orbitParent: data.orbitParent
            };
            DesignerStore.state.nodes[id] = node;
        } else {
            // Update existing nodes
            node.x = data.x * scale;
            node.y = data.y * scale;
            node.label = data.label;
            node.message = data.message;
            node.parentId = data.parentId;
            if (data.isStickyNote) node.text = data.text;
        }

        // Hydrate Dimensions (Issue #6)
        if (data.dimensions) {
            node.dimensions = {
                w: data.dimensions.w,
                h: data.dimensions.h,
                targetW: data.dimensions.w,
                targetH: data.dimensions.h,
                animW: data.dimensions.w,
                animH: data.dimensions.h,
                isManual: data.dimensions.isManual
            };
        } else if (!node.dimensions) {
            // Fallback for missing dimensions in saved data
            node.dimensions = {
                w: data.manualWidth || data.width || 180,
                h: data.manualHeight || data.height || 100,
                targetW: data.manualWidth || data.width || 180,
                targetH: data.manualHeight || data.height || 100,
                animW: data.manualWidth || data.width || 180,
                animH: data.manualHeight || data.height || 100,
                isManual: !!(data.manualWidth || data.manualHeight)
            };
        }

        // Re-register dynamic containers
        if (data.isRepoContainer && id.startsWith('custom_')) {
            const dims = node.dimensions;
            const bounds = {
                minX: node.x - dims.w / 2,
                minY: node.y - dims.h / 2,
                maxX: node.x + dims.w / 2,
                maxY: node.y + dims.h / 2
            };

            if (typeof ContainerBoxManager?.createUserBox === 'function') {
                ContainerBoxManager.createUserBox(id, bounds, 40);
            }
        }
    }
};
