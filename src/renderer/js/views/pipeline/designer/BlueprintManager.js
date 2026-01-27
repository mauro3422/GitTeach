import { DESIGNER_CONSTANTS } from './DesignerConstants.js';

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

        // Also download for manual backup
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blueprint, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `manual_blueprint_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

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
            console.warn('[BlueprintManager] No blueprint found in file system or localStorage');
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

        // ADD: Future-proof - apply migrations if needed
        if (version !== DESIGNER_CONSTANTS.BLUEPRINT_VERSIONING.CURRENT_VERSION) {
            console.log(`[BlueprintManager] Applying migrations from ${version} to ${DESIGNER_CONSTANTS.BLUEPRINT_VERSIONING.CURRENT_VERSION}`);
            // When migrations are added, they would be applied here
            // For now, existing dimension migration (lines 104-131) handles v1.2→v1.3
        }

        // Validation & Dimension Migration
        try {
            if (!rawData.layout || typeof rawData.layout !== 'object') {
                console.error('[BlueprintManager] Invalid blueprint: missing or invalid layout property');
                return null;
            }

            Object.keys(rawData.layout).forEach(id => {
                const node = rawData.layout[id];
                node.x = node.x ?? 0.5;
                node.y = node.y ?? 0.5;
                node.label = node.label || id;

                // MIGRATION: Convert old size properties to unified dimensions
                if (!node.dimensions) {
                    const { STICKY_NOTE, CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
                    node.dimensions = {
                        w: node.manualWidth || node.width || (node.isStickyNote ? STICKY_NOTE.MIN_W : CONTAINER.DEFAULT_W),
                        h: node.manualHeight || node.height || (node.isStickyNote ? STICKY_NOTE.MIN_H : CONTAINER.DEFAULT_H),
                        isManual: !!(node.manualWidth || node.manualHeight)
                    };
                    // Ensure animation properties exist for fresh loads
                    node.dimensions.animW = node.dimensions.w;
                    node.dimensions.animH = node.dimensions.h;
                    node.dimensions.targetW = node.dimensions.w;
                    node.dimensions.targetH = node.dimensions.h;
                }
            });

            console.log('[BlueprintManager] Successfully loaded and migrated blueprint with', Object.keys(rawData.layout).length, 'nodes');
            return rawData;
        } catch (err) {
            console.error('[BlueprintManager] Failed to process blueprint:', err.message);
            return null;
        }
    },

    generateBlueprint(manualConnections, nodesOverride = null) {
        const nodesToExport = nodesOverride || this.nodes;
        const blueprint = {
            version: DESIGNER_CONSTANTS.BLUEPRINT_VERSIONING.CURRENT_VERSION,  // Use constant
            timestamp: new Date().toISOString(),
            layout: {},
            connections: manualConnections
        };

        const scale = DESIGNER_CONSTANTS.DIMENSIONS.DEFAULT_HYDRATION_SCALE;
        Object.values(nodesToExport).forEach(node => {
            // Clean up temporary props before saving (Issue #5)
            const exportNode = {
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
                icon: node.icon || '🧩',
                orbitParent: node.orbitParent || null,
                // PERSISTENCE FIX: Save secondary visual properties for seamless restoration
                description: node.description || "",
                internalClasses: node.internalClasses || [],
                // Only save essential dimensions
                dimensions: {
                    w: node.dimensions?.w || (node.isStickyNote ? DESIGNER_CONSTANTS.DIMENSIONS.STICKY_NOTE.MIN_W : DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.DEFAULT_W),
                    h: node.dimensions?.h || (node.isStickyNote ? DESIGNER_CONSTANTS.DIMENSIONS.STICKY_NOTE.MIN_H : DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.DEFAULT_H),
                    isManual: node.dimensions?.isManual || false
                }
            };
            blueprint.layout[node.id] = exportNode;
        });
        return blueprint;
    }
};
