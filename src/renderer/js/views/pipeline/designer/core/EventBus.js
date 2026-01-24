/**
 * EventBus.js
 * Simple EventEmitter for Designer System
 *
 * Replaces callback hell with clean event-based architecture
 * Usage: EventBus.on('event-name', callback)
 *        EventBus.emit('event-name', data)
 */

export const EventBus = {
    listeners: {},

    /**
     * Subscribe to an event
     * @param {string} eventName
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);

        // Return unsubscribe function
        return () => {
            this.off(eventName, callback);
        };
    },

    /**
     * Subscribe to event once
     * @param {string} eventName
     * @param {Function} callback
     */
    once(eventName, callback) {
        const unsubscribe = this.on(eventName, (...args) => {
            callback(...args);
            unsubscribe();
        });
        return unsubscribe;
    },

    /**
     * Unsubscribe from event
     * @param {string} eventName
     * @param {Function} callback
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;

        const index = this.listeners[eventName].indexOf(callback);
        if (index !== -1) {
            this.listeners[eventName].splice(index, 1);
        }

        // Clean up empty arrays
        if (this.listeners[eventName].length === 0) {
            delete this.listeners[eventName];
        }
    },

    /**
     * Emit event to all listeners
     * @param {string} eventName
     * @param {*} data
     */
    emit(eventName, data) {
        if (!this.listeners[eventName]) return;

        this.listeners[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`[EventBus] Error in ${eventName} listener:`, e.message);
            }
        });
    },

    /**
     * Clear all listeners
     */
    clear() {
        this.listeners = {};
    },

    /**
     * Get listener count for event
     * @param {string} eventName
     * @returns {number}
     */
    listenerCount(eventName) {
        return this.listeners[eventName]?.length ?? 0;
    }
};

/**
 * DESIGNER SYSTEM EVENTS
 * These are the standard events emitted by DesignerInteraction
 */
export const DESIGNER_EVENTS = {
    // Rendering
    'designer:update': 'Render/update requested',

    // Node events
    'node:created': 'Node created (data: node)',
    'node:deleted': 'Node deleted (data: nodeId)',
    'node:selected': 'Node selected (data: nodeId)',
    'node:deselected': 'Node deselected',
    'node:hovered': 'Node hovered (data: nodeId)',
    'node:unhovered': 'Node unhovered',
    'node:double-click': 'Node double clicked (data: node)',
    'node:dropped': 'Node dropped onto container (data: {nodeId, containerId})',
    'node:extracted': 'Node extracted from container (data: {nodeId, parentId})',

    // Connection events
    'connection:created': 'Connection created (data: {fromId, toId})',
    'connection:deleted': 'Connection deleted (data: connectionId)',
    'connection:selected': 'Connection selected (data: connectionId)',

    // Sticky note events
    'sticky-note:edit': 'Sticky note edit requested (data: note)',

    // Interaction events
    'interaction:start': 'Interaction started (data: mode)',
    'interaction:end': 'Interaction ended',

    // Lifecycle events
    'editor:mounted': 'Editor fully initialized',
    'editor:unmounted': 'Editor being destroyed'
};

/**
 * Legacy adapter for callback-based code
 * Helps transition from 9 callbacks to EventBus
 */
export const EventBusAdapter = {
    /**
     * Convert callback-based init to EventBus
     * Usage:
     *   old: init(canvas, nodeProvider, onUpdate, onConnection, ...)
     *   new: init(canvas, nodeProvider)
     *        EventBus.on('designer:update', onUpdate)
     *        EventBus.on('connection:created', onConnection)
     */
    createFromCallbacks(callbacks = {}) {
        const adapters = {};

        if (callbacks.onUpdate) {
            EventBus.on('designer:update', callbacks.onUpdate);
            adapters.onUpdate = callbacks.onUpdate;
        }

        if (callbacks.onConnection) {
            EventBus.on('connection:created', callbacks.onConnection);
            adapters.onConnection = callbacks.onConnection;
        }

        if (callbacks.onNodeDoubleClick) {
            EventBus.on('node:double-click', callbacks.onNodeDoubleClick);
            adapters.onNodeDoubleClick = callbacks.onNodeDoubleClick;
        }

        if (callbacks.onNodeDrop) {
            EventBus.on('node:dropped', callbacks.onNodeDrop);
            adapters.onNodeDrop = callbacks.onNodeDrop;
        }

        if (callbacks.onStickyNoteEdit) {
            EventBus.on('sticky-note:edit', callbacks.onStickyNoteEdit);
            adapters.onStickyNoteEdit = callbacks.onStickyNoteEdit;
        }

        if (callbacks.onInteractionEnd) {
            EventBus.on('interaction:end', callbacks.onInteractionEnd);
            adapters.onInteractionEnd = callbacks.onInteractionEnd;
        }

        if (callbacks.onDeleteNode) {
            EventBus.on('node:deleted', callbacks.onDeleteNode);
            adapters.onDeleteNode = callbacks.onDeleteNode;
        }

        return adapters;
    }
};
