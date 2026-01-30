import { DESIGNER_CONSTANTS } from './DesignerConstants.js';
import { NodeFactory } from './modules/NodeFactory.js';
import { PIPELINE_NODES } from '../PipelineConstants.js';


export const BlueprintManager = {
    nodes: null,

    init(nodes) {
        this.nodes = nodes;
    },

    save(manualConnections = [], nodesOverride = null) {
        const blueprint = this.generateBlueprint(manualConnections, nodesOverride);

        // Persistent save to file system (primary) and LocalStorage (backup)
        if (window.designerAPI) {
            window.designerAPI.saveBlueprint(blueprint)
                .then(result => {
                    console.log(`[BlueprintManager] Saved to: ${result.path}`);
                })
                .catch(error => {
                    console.error('[BlueprintManager] Failed to save to file system:', error.message);
                    // Continue - localStorage save will handle it
                });
        }

        // SAFETY: Save to LocalStorage with quota checking
        try {
            const blueprintJson = JSON.stringify(blueprint);
            localStorage.setItem('giteach_designer_blueprint', blueprintJson);
            console.log('[BlueprintManager] Persisted to localStorage');
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('[BlueprintManager] LocalStorage quota exceeded. Clean old data or use file system instead.');
                // Fallback: Try to store minimal info
                try {
                    localStorage.setItem('giteach_designer_blueprint_error', `Quota exceeded at ${new Date().toISOString()}`);
                } catch (e2) {
                    console.warn('[BlueprintManager] LocalStorage completely full');
                }
            } else {
                console.error('[BlueprintManager] Failed to save to localStorage:', e.message);
            }
        }

        console.log("[BlueprintManager] Manual save completed and persisted to storage.");

        console.log("[BlueprintManager] Saved manual blueprint and persisted:", blueprint);
    },

    async autoSave(nodes, manualConnections = []) {
        const blueprint = this.generateBlueprint(manualConnections, nodes);

        // Save to file system (primary) for debugging
        if (window.designerAPI) {
            try {
                await window.designerAPI.saveBlueprint(blueprint);
            } catch (e) {
                console.error('[BlueprintManager] Failed to auto-save to file system:', e.message);
            }
        }

        // SAFETY: Also save to LocalStorage as backup with quota checking
        try {
            const blueprintJson = JSON.stringify(blueprint);
            localStorage.setItem('giteach_designer_blueprint', blueprintJson);
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('[BlueprintManager] LocalStorage quota exceeded during autoSave');
                // Data loss prevented because file system save already attempted
            } else {
                console.error('[BlueprintManager] Failed to autoSave to localStorage:', e.message);
            }
        }
    },

    async loadFromLocalStorage() {
        let rawData = null;
        if (window.designerAPI) {
            try {
                rawData = await window.designerAPI.loadBlueprint();
                console.log('[BlueprintManager] Loaded from file system');
            } catch (e) {
                console.warn('[BlueprintManager] Failed to load from file system:', e.message);
            }
        }

        // FALLBACK: Always check localStorage if file system load failed/returned empty
        if (!rawData) {
            const data = localStorage.getItem('giteach_designer_blueprint');
            if (data) {
                try {
                    rawData = JSON.parse(data);
                    console.log('[BlueprintManager] Loaded from localStorage');
                } catch (e) {
                    console.error('[BlueprintManager] Failed to parse JSON from localStorage:', e.message);
                    return null;
                }
            }
        }
        if (!rawData) {
            console.warn('[BlueprintManager] No blueprint found via standard methods.');
            // rawData = await this._loadRobustFallback(); // Disabled for clean architecture
        }

        if (!rawData) {
            console.warn('[BlueprintManager] All loading attempts failed. Reverting to factory defaults.');
            return null;
        }

        // ADD: Validate version BEFORE processing
        const version = rawData?.version || '1.0.0';
        if (!DESIGNER_CONSTANTS.BLUEPRINT_VERSIONING.isSupported(version)) {
            console.error(`[BlueprintManager] Unsupported blueprint version: ${version}`);
            console.error(`[BlueprintManager] Current version: ${DESIGNER_CONSTANTS.BLUEPRINT_VERSIONING.CURRENT_VERSION}`);
            return null;  // Cannot load unsupported version
        }

        // ADD: Log version info
        console.log(`[BlueprintManager] Loading blueprint version: ${version}`);

        return rawData;
    },

    // Reverted: Clean architecture relies on correct cacheHandler configuration in Main Process.
    async _loadRobustFallback() {
        return null;
    },

    generateBlueprint(manualConnections, nodesOverride = null) {
        const nodesToExport = nodesOverride || this.nodes;
        const blueprint = {
            version: DESIGNER_CONSTANTS.BLUEPRINT_VERSIONING.CURRENT_VERSION,
            timestamp: new Date().toISOString(),
            layout: {},
            connections: manualConnections
        };

        const scale = DESIGNER_CONSTANTS.DIMENSIONS.DEFAULT_HYDRATION_SCALE;
        Object.values(nodesToExport).forEach(node => {
            const isBuiltIn = !!PIPELINE_NODES[node.id];

            let exportNode;
            if (isBuiltIn) {
                // DELTA STORAGE: Only save state overrides for Registry nodes
                exportNode = {
                    x: node.x / scale,
                    y: node.y / scale,
                    message: node.message || "",
                    parentId: node.parentId || null,
                    dimensions: {
                        isManual: node.dimensions?.isManual || false,
                        w: node.dimensions?.isManual ? node.dimensions.w : undefined,
                        h: node.dimensions?.isManual ? node.dimensions.h : undefined
                    }
                };
            } else {
                // FULL STORAGE: Custom nodes (Sticky notes, custom boxes) need full data
                exportNode = {
                    x: node.x / scale,
                    y: node.y / scale,
                    label: node.label,
                    message: node.message || "",
                    parentId: node.parentId || null,
                    isStickyNote: node.isStickyNote || false,
                    text: node.text || "",
                    color: node.color,
                    isRepoContainer: node.isRepoContainer || false,
                    isSatellite: node.isSatellite || false,
                    icon: node.icon || '🧩',
                    orbitParent: node.orbitParent || null,
                    description: node.description || "",
                    internalClasses: node.internalClasses || [],
                    dimensions: {
                        w: node.dimensions?.w || (node.isStickyNote ? DESIGNER_CONSTANTS.DIMENSIONS.STICKY_NOTE.MIN_W : DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.DEFAULT_W),
                        h: node.dimensions?.h || (node.isStickyNote ? DESIGNER_CONSTANTS.DIMENSIONS.STICKY_NOTE.MIN_H : DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.DEFAULT_H),
                        isManual: node.dimensions?.isManual || false
                    }
                };
            }

            blueprint.layout[node.id] = exportNode;
        });
        return blueprint;
    }
};
