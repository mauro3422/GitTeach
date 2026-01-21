export const BlueprintManager = {
    nodes: null,

    init(nodes) {
        this.nodes = nodes;
    },

    save(manualConnections = [], nodesOverride = null) {
        const blueprint = this.generateBlueprint(manualConnections, nodesOverride);

        // Persistent save to file system (primary) and LocalStorage (backup)
        if (window.designerAPI) {
            window.designerAPI.saveBlueprint(blueprint).then(result => {
                console.log(`[BlueprintManager] Saved to: ${result.path}`);
            });
        }
        localStorage.setItem('giteach_designer_blueprint', JSON.stringify(blueprint));

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
            await window.designerAPI.saveBlueprint(blueprint);
        }
        // Also save to LocalStorage as backup
        localStorage.setItem('giteach_designer_blueprint', JSON.stringify(blueprint));
    },

    async loadFromLocalStorage() {
        // Try file system first (for debugging persistence)
        if (window.designerAPI) {
            try {
                const fileData = await window.designerAPI.loadBlueprint();
                if (fileData) {
                    console.log("[BlueprintManager] Loaded from file system");
                    return fileData;
                }
            } catch (e) {
                console.warn("[BlueprintManager] File system load failed:", e);
            }
        }

        // Fallback to LocalStorage
        const data = localStorage.getItem('giteach_designer_blueprint');
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("[BlueprintManager] Error loading from localStorage:", e);
            return null;
        }
    },

    generateBlueprint(manualConnections, nodesOverride = null) {
        const nodesToExport = nodesOverride || this.nodes;
        const blueprint = {
            version: "1.2.0 (Forensic Persistence)",
            timestamp: new Date().toISOString(),
            layout: {},
            connections: manualConnections
        };

        const scale = 1200;
        Object.values(nodesToExport).forEach(node => {
            blueprint.layout[node.id] = {
                x: node.x / scale,
                y: node.y / scale,
                label: node.label,
                message: node.message || "",
                parentId: node.parentId || null, // CRITICAL: Preserve hierarchy
                // Sticky note specific fields
                isStickyNote: node.isStickyNote || false,
                text: node.text || "",
                width: node.width,
                height: node.height,
                manualWidth: node.manualWidth,
                manualHeight: node.manualHeight,
                color: node.color,
                // Container specific
                isRepoContainer: node.isRepoContainer || false,
                isSatellite: node.isSatellite || false,
                orbitParent: node.orbitParent || null
            };
        });
        return blueprint;
    }
};
