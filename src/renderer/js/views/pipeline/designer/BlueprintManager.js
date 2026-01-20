export const BlueprintManager = {
    nodes: null,

    init(nodes) {
        this.nodes = nodes;
    },

    save(manualConnections = []) {
        const blueprint = {
            version: "1.1.0 (Manual Connect)",
            timestamp: new Date().toISOString(),
            layout: {},
            connections: manualConnections // NEW: Export user-drawn connections
        };

        const scale = 1200;
        Object.values(this.nodes).forEach(node => {
            blueprint.layout[node.id] = {
                x: node.x / scale,
                y: node.y / scale,
                label: node.label
            };
        });

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blueprint, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `manual_blueprint_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        console.log("[BlueprintManager] Saved manual blueprint:", blueprint);
    }
};
