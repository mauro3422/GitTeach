/**
 * EventQueueBuffer.js
 * Accumulates pipeline events for visualization in the debugger.
 * SOLID: Single Responsibility - only buffers events for display.
 */

import { pipelineEventBus } from './PipelineEventBus.js';

class EventQueueBuffer {
    constructor() {
        // Circular buffer for events
        this.buffer = [];
        this.maxSize = 500;

        // Event ID counter
        this.eventId = 0;

        // Subscribers for buffer updates
        this.listeners = new Set();

        // Stats
        this.stats = {
            queued: 0,
            processing: 0,
            done: 0,
            errors: 0
        };

        // Subscribe to pipeline events
        this._subscribeToEvents();

        console.log('[EventQueueBuffer] Initialized');
    }

    /**
     * Subscribe to all pipeline events
     * @private
     */
    _subscribeToEvents() {
        pipelineEventBus.on('*', (event) => {
            this._addEvent(event);
        });
    }

    /**
     * Add event to buffer
     * @private
     */
    _addEvent(event) {
        const bufferEntry = {
            id: ++this.eventId,
            timestamp: event.timestamp || Date.now(),
            type: event.event,
            port: event.payload?.port || this._inferPort(event.event),
            status: this._inferStatus(event.event),
            payload: event.payload,
            display: this._formatDisplay(event)
        };

        // Update stats
        this._updateStats(bufferEntry);

        // Add to buffer (circular)
        this.buffer.push(bufferEntry);
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }

        // Notify listeners
        this._notifyListeners(bufferEntry);
    }

    /**
     * Infer port from event type
     * @private
     */
    _inferPort(eventType) {
        if (eventType.includes('gpu')) return 8000;
        if (eventType.includes('cpu') || eventType.includes('mapper')) return 8002;
        if (eventType.includes('embedding')) return 8001;
        return null;
    }

    /**
     * Infer status from event type
     * @private
     */
    _inferStatus(eventType) {
        if (eventType.endsWith(':start') || eventType.includes('scanning')) return 'processing';
        if (eventType.endsWith(':end') || eventType.includes('completed')) return 'done';
        if (eventType.includes('error')) return 'error';
        if (eventType.includes('queued')) return 'queued';
        return 'queued';
    }

    /**
     * Format display text for event
     * @private
     */
    _formatDisplay(event) {
        const payload = event.payload || {};

        // Extract meaningful info
        if (payload.file) {
            return payload.file.split('/').pop(); // Just filename
        }
        if (payload.type) {
            return payload.type; // Mapper type
        }
        if (payload.batchSize) {
            return `batch(${payload.batchSize})`;
        }

        return event.event.split(':')[0]; // Fallback to event prefix
    }

    /**
     * Update statistics
     * @private
     */
    _updateStats(entry) {
        if (entry.status === 'processing') {
            this.stats.processing++;
            this.stats.queued = Math.max(0, this.stats.queued - 1);
        } else if (entry.status === 'done') {
            this.stats.processing = Math.max(0, this.stats.processing - 1);
            this.stats.done++;
        } else if (entry.status === 'error') {
            this.stats.processing = Math.max(0, this.stats.processing - 1);
            this.stats.errors++;
        } else if (entry.status === 'queued') {
            this.stats.queued++;
        }
    }

    /**
     * Get all buffered events
     */
    getAll() {
        return [...this.buffer];
    }

    /**
     * Get events by port
     * @param {number} port - Server port
     */
    getByPort(port) {
        return this.buffer.filter(e => e.port === port);
    }

    /**
     * Get events by status
     * @param {string} status - queued, processing, done, error
     */
    getByStatus(status) {
        return this.buffer.filter(e => e.status === status);
    }

    /**
     * Get current stats
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Get recent events (last N)
     * @param {number} count
     */
    getRecent(count = 20) {
        return this.buffer.slice(-count);
    }

    /**
     * Clear buffer
     */
    clear() {
        this.buffer = [];
        this.stats = { queued: 0, processing: 0, done: 0, errors: 0 };
        this._notifyListeners(null);
        console.log('[EventQueueBuffer] Cleared');
    }

    /**
     * Subscribe to buffer updates
     * @param {Function} callback - (entry) => void
     * @returns {Function} unsubscribe
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify listeners
     * @private
     */
    _notifyListeners(entry) {
        this.listeners.forEach(cb => {
            try {
                cb(entry, this.stats);
            } catch (e) {
                console.error('[EventQueueBuffer] Listener error:', e);
            }
        });
    }
}

// Singleton instance
export const eventQueueBuffer = new EventQueueBuffer();
export default eventQueueBuffer;
