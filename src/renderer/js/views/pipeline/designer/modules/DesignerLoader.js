import { BlueprintManager } from '../BlueprintManager.js';
import { DesignerStore } from './DesignerStore.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { NodeFactory } from './NodeFactory.js';
import { PIPELINE_NODES } from '../../PipelineConstants.js';

export const DesignerLoader = {
    /**
     * Carga y hidrata el estado desde LocalStorage/File System
     */
    async loadAndHydrate() {
        // STEP 1: Skeleton Stage - Initialize all Registry nodes first
        // This guarantees that all system nodes exist, even if missing from JSON.
        DesignerStore.loadInitialNodes();
        const nodes = { ...DesignerStore.state.nodes };

        // STEP 2: Load Saved State (FileSystem / LocalStorage)
        const savedState = await BlueprintManager.loadFromLocalStorage();
        if (savedState && savedState.layout) {
            const scale = DESIGNER_CONSTANTS.DIMENSIONS.DEFAULT_HYDRATION_SCALE;
            const version = savedState.version || '1.0.0';
            const isLegacy = version.startsWith('1.');

            console.log(`[DesignerLoader] Hydrating blueprint v${version} (Legacy: ${isLegacy})`);

            // STEP 3: Patch/Skin Stage - Apply saved data as "overlays"
            Object.entries(savedState.layout).forEach(([id, data]) => {
                this.hydrateNode(id, data, scale, nodes, isLegacy);
            });

            // STEP 4: Finalize State
            DesignerStore.setNodes(nodes);
            DesignerStore.setConnections(Array.isArray(savedState.connections) ? savedState.connections : []);

            // Final notify after all hydration is done
            DesignerStore.setState({}, 'HYDRATION_COMPLETE');

            // Validate and cleanup orphaned connections/nodes after hydration
            DesignerStore.validateAndCleanup();
            console.log('[DesignerLoader] Hydration complete with v2.0.0 modular merge');
        }
    },

    /**
     * Patch/Hydrate an individual node. 
     * Performs a Merge (Registry + Delta) for built-in nodes.
     * Performs a full Creation for custom/legacy nodes.
     */
    hydrateNode(id, data, scale, targetNodes, isLegacy) {
        try {
            if (!data || typeof data !== 'object') return;

            const existingNode = targetNodes[id];
            const registryConfig = PIPELINE_NODES ? PIPELINE_NODES[id] : null;

            // DETERMINATION: Is this a Registry node we are patching, or a new User node?
            const isBuiltIn = !!registryConfig;

            if (isBuiltIn) {
                // PATCH LOGIC: Reuse the existing "Skeleton" node created by DesignerHydrator/loadInitialNodes
                if (!existingNode) {
                    console.warn(`[DesignerLoader] Built-in node ${id} found in JSON but missing in Runtime Registry. Proceeding with manual creation.`);
                } else {
                    // Update only position, message, and parenting (The "Delta")
                    existingNode.x = data.x * scale;
                    existingNode.y = data.y * scale;
                    existingNode.message = data.message || "";
                    existingNode.parentId = data.parentId || null;

                    // Handle manual dimensions override
                    if (data.dimensions?.isManual) {
                        existingNode.dimensions.w = data.dimensions.w;
                        existingNode.dimensions.h = data.dimensions.h;
                        existingNode.dimensions.targetW = data.dimensions.w;
                        existingNode.dimensions.targetH = data.dimensions.h;
                        existingNode.dimensions.isManual = true;
                    }
                    return; // Done with built-in patching
                }
            }

            // CREATION LOGIC: For Stickies, Custom Boxes, or Orphans from stale registries
            const isStickyNote = data.isStickyNote || id.startsWith('sticky_');
            const isContainer = data.isRepoContainer;
            const isSatellite = data.isSatellite;

            const nodeData = {
                id,
                x: data.x * scale,
                y: data.y * scale,
                label: data.label,
                message: data.message || "",
                parentId: data.parentId || null,
                icon: data.icon || (isStickyNote ? '📝' : (isContainer ? '📦' : '🧩')),
                color: data.color || ThemeManager.colors.drawerBorder,
                text: isStickyNote ? (data.text || "") : "",
                orbitParent: data.orbitParent || null,
                description: data.description || "",
                internalClasses: data.internalClasses || []
            };

            let node;
            if (isStickyNote) {
                node = NodeFactory.createStickyNote(nodeData);
            } else if (isContainer) {
                node = NodeFactory.createContainerNode(nodeData);
            } else if (isSatellite) {
                node = NodeFactory.createSatelliteNode(nodeData);
            } else {
                node = NodeFactory.createRegularNode(nodeData);
            }

            // Patch dimensions for custom nodes
            if (data.dimensions && node.dimensions) {
                Object.assign(node.dimensions, {
                    w: data.dimensions.w,
                    h: data.dimensions.h,
                    targetW: data.dimensions.w,
                    targetH: data.dimensions.h,
                    animW: data.dimensions.w,
                    animH: data.dimensions.h,
                    isManual: data.dimensions.isManual
                });
            }

            targetNodes[id] = node;

            // Re-register dynamic containers in the BoxManager
            if (isContainer && id.startsWith('custom_')) {
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
        } catch (e) {
            console.error(`[DesignerLoader] Failed to hydrate node ${id}:`, e.message);
        }
    }
};
