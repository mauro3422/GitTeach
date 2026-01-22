/**
 * DesignerEvents.js
 * Centralized event interface for the designer module
 * DIP: Avoids direct dependency on global singleton
 */

import { globalEventBus } from '../../../../core/EventBus.js';

export const DesignerEvents = {
    // Core event methods
    emit: (event, ...args) => globalEventBus.emit(event, ...args),
    on: (event, callback) => globalEventBus.on(event, callback),
    off: (event, callback) => globalEventBus.off(event, callback),
    once: (event, callback) => globalEventBus.once(event, callback),

    // Designer-specific event constants
    RENDER_REQUEST: 'designer:render:request',
    NODE_UPDATED: 'designer:node:updated',
    CONNECTION_ADDED: 'designer:connection:added',
    CONNECTION_REMOVED: 'designer:connection:removed',
    INTERACTION_START: 'designer:interaction:start',
    INTERACTION_END: 'designer:interaction:end',

    // Convenience methods for common events
    requestRender: () => DesignerEvents.emit(DesignerEvents.RENDER_REQUEST),
    emitNodeUpdate: (nodeId, changes) => DesignerEvents.emit(DesignerEvents.NODE_UPDATED, nodeId, changes),
    emitConnectionAdded: (fromId, toId) => DesignerEvents.emit(DesignerEvents.CONNECTION_ADDED, fromId, toId),
    emitConnectionRemoved: (fromId, toId) => DesignerEvents.emit(DesignerEvents.CONNECTION_REMOVED, fromId, toId)
};
