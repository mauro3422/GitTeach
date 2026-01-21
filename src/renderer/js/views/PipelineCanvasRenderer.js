/**
 * PipelineCanvasRenderer.js
 * Responsabilidad: Loop de animación y coordinación del dibujo.
 */

import { PipelineRenderer } from './pipeline/PipelineRenderer.js';
import { PipelineInteraction } from './pipeline/PipelineInteraction.js';
import { PipelineStateManager } from './pipeline/PipelineStateManager.js';
import { PipelineParticleManager } from './pipeline/PipelineParticleManager.js';
import { LayoutEngine } from './pipeline/LayoutEngine.js';
import { RendererLogger } from '../utils/RendererLogger.js';

export const PipelineCanvasRenderer = {
    ctx: null,
    animationId: null,
    width: 0,
    height: 450,
    hoveredNode: null,
    selectedNode: null,

    /**
     * Inicializa el renderer con el contexto del canvas
     */
    init(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    },

    /**
     * Inicia el loop de renderizado
     */
    start() {
        if (this.animationId) return; // Ya está corriendo

        const render = () => {
            try {
                this.draw();
                this.animationId = requestAnimationFrame(render);
            } catch (err) {
                RendererLogger.error('[PipelineCanvasRenderer] Render crash:', {
                    context: { component: 'PipelineCanvasRenderer', error: err.message },
                    debugData: { stack: err.stack }
                });
                this.stop();
            }
        };
        render();
    },

    /**
     * Detiene el loop de renderizado
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },

    /**
     * Actualiza la cámara suavemente hacia el punto focal
     */
    updateCamera() {
        // Don't auto-pan if the user is currently interacting or has manual control
        if (PipelineInteraction.state.isPanning || !PipelineInteraction.state.autoFollow) return;

        const focalPoint = LayoutEngine.getFocalPoint(
            this.width,
            this.height,
            PipelineStateManager.nodeStates,
            this.selectedNode || this.hoveredNode
        );
        const { zoomScale } = PipelineInteraction.state;

        // Calculate the target pan that would put focalPoint in the center of the viewport
        const targetPanX = (this.width / 2) - (focalPoint.x * zoomScale);
        const targetPanY = (this.height / 2) - (focalPoint.y * zoomScale);

        // Smooth drift (LERP)
        const lerpFactor = 0.08;
        PipelineInteraction.state.panOffset.x += (targetPanX - PipelineInteraction.state.panOffset.x) * lerpFactor;
        PipelineInteraction.state.panOffset.y += (targetPanY - PipelineInteraction.state.panOffset.y) * lerpFactor;
    },

    /**
     * Método principal de dibujo
     */
    draw() {
        if (!this.ctx) return;

        // Actualizar elementos volátiles
        this.updateTravelingPackages();
        this.updateCamera();
        PipelineStateManager.cleanupParticles();

        // Preparar canvas
        PipelineRenderer.prepare(this.ctx, this.width, this.height);

        // --- GLOBAL TRANSFORM START ---
        this.ctx.save();
        this.ctx.translate(PipelineInteraction.state.panOffset.x, PipelineInteraction.state.panOffset.y);
        this.ctx.scale(PipelineInteraction.state.zoomScale, PipelineInteraction.state.zoomScale);

        // Dibujar elementos
        PipelineRenderer.drawConnections(this.ctx, this.width, this.height, PipelineStateManager.nodeStats);
        PipelineRenderer.drawParticles(this.ctx, PipelineStateManager.particles);
        PipelineRenderer.drawTravelingPackages(this.ctx, this.width, this.height, PipelineStateManager.travelingPackages);
        PipelineRenderer.drawPulses(this.ctx, PipelineStateManager.pulses);

        if (this.selectedNode) {
            PipelineRenderer.drawSelectionGlow(this.ctx, this.width, this.height, this.selectedNode);
        }

        // Dibujar nodos
        PipelineRenderer.drawNodes(
            this.ctx,
            this.width,
            this.height,
            PipelineStateManager.nodeStates,
            PipelineStateManager.nodeStats,
            this.hoveredNode,
            PipelineStateManager.nodeHealth
        );

        if (this.hoveredNode && !this.selectedNode) {
            PipelineRenderer.drawTooltip(this.ctx, this.width, this.height, this.hoveredNode, PipelineStateManager.nodeStats);
        }

        this.ctx.restore();
        // --- GLOBAL TRANSFORM END ---
    },

    /**
     * Actualiza paquetes viajeros
     */
    updateTravelingPackages() {
        PipelineParticleManager.updateTravelingPackages();
    },

    /**
     * Actualiza dimensiones del renderer
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
};
