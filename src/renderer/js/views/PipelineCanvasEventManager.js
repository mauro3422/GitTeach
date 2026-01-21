/**
 * PipelineCanvasEventManager.js
 * Responsabilidad: Suscripción a eventQueueBuffer y delegación de eventos.
 */

import { eventQueueBuffer } from '../services/pipeline/EventQueueBuffer.js';
import { PipelineStateManager } from './pipeline/PipelineStateManager.js';
import { PipelineEventHandler } from './pipeline/PipelineEventHandler.js';

export const PipelineCanvasEventManager = {
    handler: null,

    /**
     * Inicializa el event manager con el handler del canvas
     */
    init(handler) {
        this.handler = handler;
        this.subscribeToEvents();
    },

    /**
     * Suscribe a eventos del pipeline
     */
    subscribeToEvents() {
        eventQueueBuffer.subscribe((event) => {
            if (!event) return;
            this.handlePipelineEvent(event);

            if (event.type === 'system:fleet-status') {
                this.handleFleetStatus(event.payload);
            }
        });
    },

    /**
     * Maneja eventos del pipeline
     */
    handlePipelineEvent(entry) {
        const result = PipelineEventHandler.handleEvent(
            entry,
            (nodeId, color) => PipelineStateManager.addParticles(nodeId, color),
            (fromId, toId, file) => PipelineStateManager.addTravelingPackage(fromId, toId, file)
        );

        if (result && !result.redundant) {
            if (this.handler && this.handler.selectedNode === result.nodeId) {
                this.handler.refreshDrawer();
            }
        }
    },

    /**
     * Maneja cambios en el estado de la flota
     */
    handleFleetStatus(fleetState) {
        if (PipelineStateManager.updateHealth(fleetState)) {
            if (this.handler && this.handler.selectedNode) {
                this.handler.refreshDrawer();
            }
        }
    }
};
