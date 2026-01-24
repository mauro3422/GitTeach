import { BlueprintManager } from '../BlueprintManager.js';
import { DesignerStore } from './DesignerStore.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { NodeFactory } from './NodeFactory.js';

export const DesignerLoader = {
    /**
     * Carga y hidrata el estado desde LocalStorage/File System
     */
    async loadAndHydrate() {
        // Load Initial State
        DesignerStore.loadInitialNodes();

        // MERGE with File System / LocalStorage if exists
        const savedState = await BlueprintManager.loadFromLocalStorage();
        if (savedState && savedState.layout) {
            const scale = DESIGNER_CONSTANTS.DIMENSIONS.DEFAULT_HYDRATION_SCALE;
            Object.entries(savedState.layout).forEach(([id, data]) => {
                this.hydrateNode(id, data, scale);
            });
            DesignerStore.setConnections(Array.isArray(savedState.connections) ? savedState.connections : []);

            // Final notify after all hydration is done
            DesignerStore.setState({}, 'HYDRATION_COMPLETE');

            // Validate and cleanup orphaned connections/nodes after hydration
            DesignerStore.validateAndCleanup();
            console.log('[DesignerLoader] Hydration complete with validation');
        }
    },

    /**
     * Hidrata un nodo individual desde el estado guardado
     */
    hydrateNode(id, data, scale) {
        let node = DesignerStore.getNode(id);

        if (!node) {
            // Create custom/lost nodes using NodeFactory to guarantee properties
            const isStickyNote = data.isStickyNote || id.startsWith('sticky_');
            const isContainer = data.isRepoContainer;
            const isSatellite = data.isSatellite;

            const nodeData = {
                id,
                x: data.x * scale,
                y: data.y * scale,
                label: data.label,
                message: data.message,
                parentId: data.parentId,
                icon: isStickyNote ? '📝' : (isContainer ? '📦' : '🧩'),
                color: data.color || ThemeManager.colors.drawerBorder,
                text: isStickyNote ? (data.text || "Contenido recuperado...") : "",
                orbitParent: data.orbitParent
            };

            // Use NodeFactory based on type
            if (isStickyNote) {
                node = NodeFactory.createStickyNote(nodeData);
            } else if (isContainer) {
                node = NodeFactory.createContainerNode(nodeData);
            } else if (isSatellite) {
                node = NodeFactory.createSatelliteNode(nodeData);
            } else {
                node = NodeFactory.createRegularNode(nodeData);
            }

            DesignerStore.state.nodes[id] = node;
        } else {
            // Update existing nodes with hydration data
            node.x = data.x * scale;
            node.y = data.y * scale;
            node.label = data.label;
            node.message = data.message;
            node.parentId = data.parentId;
            if (data.isStickyNote || id.startsWith('sticky_')) {
                node.isStickyNote = true;
                node.text = data.text || node.text;
            }
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
            const { STICKY_NOTE, CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
            const defW = data.isStickyNote ? STICKY_NOTE.MIN_W : CONTAINER.DEFAULT_W;
            const defH = data.isStickyNote ? STICKY_NOTE.MIN_H : CONTAINER.DEFAULT_H;

            node.dimensions = {
                w: data.manualWidth || data.width || defW,
                h: data.manualHeight || data.height || defH,
                targetW: data.manualWidth || data.width || defW,
                targetH: data.manualHeight || data.height || defH,
                animW: data.manualWidth || data.width || defW,
                animH: data.manualHeight || data.height || defH,
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
                ContainerBoxManager.createUserBox(id, bounds, DESIGNER_CONSTANTS.INTERACTION.RESIZE_MARGIN);
            }
        }
    }
};
