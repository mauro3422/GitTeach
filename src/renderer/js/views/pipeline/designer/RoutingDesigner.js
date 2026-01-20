import { DesignerCanvas } from './DesignerCanvas.js';
import { DesignerInteraction } from './DesignerInteraction.js';
import { BlueprintManager } from './BlueprintManager.js';
import { PIPELINE_NODES } from '../PipelineConstants.js';

export const RoutingDesigner = {
    canvas: null,
    ctx: null,
    nodes: {},
    manualConnections: [], // NEW: Stores connections drawn by the user

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Load Initial State (from constants)
        this.loadInitialNodes();

        // Init Sub-Modules
        DesignerCanvas.init(this.ctx);
        DesignerInteraction.init(this.canvas, this.nodes, () => this.render());
        BlueprintManager.init(this.nodes);

        // Resize and initial render
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // UI Events
        document.getElementById('save-blueprint').onclick = () => BlueprintManager.save(this.manualConnections);

        const modeBtn = document.getElementById('toggle-mode');
        modeBtn.onclick = () => {
            const isDraw = DesignerInteraction.toggleMode();
            modeBtn.innerText = isDraw ? "Mode: Draw Connection" : "Mode: Drag Node";
            modeBtn.style.background = isDraw ? "#bf3989" : "#0969da";
        };

        document.getElementById('reset-layout').onclick = () => {
            this.loadInitialNodes();
            this.manualConnections = [];
            DesignerInteraction.state.panOffset = { x: 0, y: 0 };
            DesignerInteraction.state.zoomScale = 1.0;
            this.render();
        };
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    },

    loadInitialNodes() {
        const scale = 1200;
        this.nodes = {};
        Object.entries(PIPELINE_NODES).forEach(([id, config]) => {
            if (config.isRepoContainer || (config.isDynamic && config.hidden)) return;
            this.nodes[id] = {
                id,
                x: config.x * scale,
                y: config.y * scale,
                label: config.label,
                icon: config.icon,
                color: config.color,
                isSatellite: config.isSatellite,
                orbitParent: config.orbitParent
            };
        });
    },

    addManualConnection(fromId, toId) {
        // Prevent duplicates
        if (this.manualConnections.some(c => c.from === fromId && c.to === toId)) return;
        this.manualConnections.push({ from: fromId, to: toId });
        this.render();
    },

    render() {
        if (!this.ctx) return;
        const navState = DesignerInteraction.state;

        DesignerCanvas.drawGrid(this.canvas.width, this.canvas.height, navState);

        // DRAW MANUAL CONNECTIONS ONLY
        this.manualConnections.forEach(conn => {
            const startNode = this.nodes[conn.from];
            const endNode = this.nodes[conn.to];
            if (startNode && endNode) {
                DesignerCanvas.drawSimpleLine(startNode, endNode, navState);
            }
        });

        // DRAW ACTIVE CONNECTION (While dragging)
        if (DesignerInteraction.activeConnection) {
            DesignerCanvas.drawActiveLine(
                DesignerInteraction.activeConnection.fromNode,
                DesignerInteraction.activeConnection.currentPos,
                navState
            );
        }

        DesignerCanvas.drawNodes(this.nodes, navState);
    }
};
