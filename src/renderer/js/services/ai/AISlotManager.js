/**
 * AISlotManager - Centralized concurrency controller for AI calls
 * Ensures we don't exceed the 5 available slots and manages priorities.
 */
export { AISlotPriorities } from './AISlotPriorities.js';

class AISlotManager {
    constructor(maxSlots = 5) {
        this.maxSlots = maxSlots;
        this.activeCalls = 0;
        this.queue = [];
    }

    /**
     * Acquire a slot for an AI call
     * @param {number} priority - From AISlotPriorities
     * @returns {Promise<void>}
     */
    async acquire(priority = AISlotPriorities.NORMAL) {
        if (this.activeCalls < this.maxSlots) {
            this.activeCalls++;
            return;
        }

        return new Promise((resolve) => {
            this.queue.push({ priority, resolve });
            // Sort queue by priority (lower number = higher priority)
            this.queue.sort((a, b) => a.priority - b.priority);
        });
    }

    /**
     * Release an acquired slot
     */
    release() {
        this.activeCalls--;
        this._dispatchNext();
    }

    _dispatchNext() {
        if (this.queue.length > 0 && this.activeCalls < this.maxSlots) {
            const next = this.queue.shift();
            this.activeCalls++;
            next.resolve();
        }
    }

    get activeCount() {
        return this.activeCalls;
    }

    get waitingCount() {
        return this.queue.length;
    }
}

export const aiSlotManager = new AISlotManager(5);